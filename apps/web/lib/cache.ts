import "server-only";

import Redis from "ioredis";

const DEFAULT_TTL_SECONDS = 300;
const KEY_PREFIX = "startup-atlas:v1";

type RedisState = {
  client?: Redis;
  disabled?: boolean;
};

const globalState = globalThis as typeof globalThis & {
  startupAtlasRedis?: RedisState;
  startupAtlasCacheLoads?: Map<string, Promise<unknown>>;
};

const state = (globalState.startupAtlasRedis ??= {});
const pendingLoads = (globalState.startupAtlasCacheLoads ??= new Map());

function getRedis(): Redis | null {
  if (state.disabled) return null;
  if (state.client) return state.client;

  const url = process.env.REDIS_URL;
  if (!url) {
    state.disabled = true;
    return null;
  }

  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 1_500,
  });

  client.on("error", (error) => {
    console.error("[redis] connection error; bypassing cache for this request", error);
  });
  state.client = client;
  return client;
}

export function citySnapshotCacheKey(cityId: string): string {
  return `${KEY_PREFIX}:city-snapshot:${cityId}`;
}

export function cityJobsCacheKey(cityId: string): string {
  return `${KEY_PREFIX}:city-jobs:${cityId}`;
}

export async function cachedJson<T>(
  key: string,
  load: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<T> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch (error) {
      console.error(`[redis] GET failed for ${key}; loading from database`, error);
    }
  }

  const existing = pendingLoads.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const loading = load()
    .then(async (value) => {
      if (redis && value !== null && value !== undefined) {
        try {
          await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
        } catch (error) {
          console.error(`[redis] SET failed for ${key}; returning database result`, error);
        }
      }
      return value;
    })
    .finally(() => pendingLoads.delete(key));

  pendingLoads.set(key, loading);
  return loading;
}

export async function deleteCacheKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    console.error("[redis] cache invalidation failed; entries will expire by TTL", error);
  }
}