import "server-only";

import Redis from "ioredis";

const DEFAULT_TTL_SECONDS = 300;
const KEY_PREFIX = "startup-atlas:v1";

type RedisState = {
  client?: Redis;
  connecting?: Promise<Redis | null>;
  disabled?: boolean;
};

const globalState = globalThis as typeof globalThis & {
  startupAtlasRedis?: RedisState;
  startupAtlasCacheLoads?: Map<string, Promise<unknown>>;
};

const state = (globalState.startupAtlasRedis ??= {});
const pendingLoads = (globalState.startupAtlasCacheLoads ??= new Map());

async function getRedis(): Promise<Redis | null> {
  if (state.disabled) return null;

  const url = process.env.REDIS_URL;
  if (!url) {
    state.disabled = true;
    return null;
  }

  if (state.client?.status === "ready") return state.client;
  if (state.connecting) return state.connecting;

  state.connecting = (async () => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      console.error("[redis] REDIS_URL is not a valid URL; loading from database");
      state.disabled = true;
      return null;
    }
    const useTls =
      parsed.protocol === "rediss:" || parsed.hostname.endsWith(".upstash.io");

    const client =
      state.client ??
      new Redis({
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        tls: useTls ? { servername: parsed.hostname } : undefined,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1_500,
        retryStrategy: () => null,
      });

    client.on("error", (error) => {
      console.error("[redis] connection error; bypassing cache for this request", error);
    });

    try {
      if (client.status === "wait") await client.connect();
      if (client.status !== "ready") return null;
      state.client = client;
      return client;
    } catch (error) {
      console.error("[redis] connection failed; loading from database", error);
      client.disconnect();
      state.client = undefined;
      return null;
    } finally {
      state.connecting = undefined;
    }
  })();

  return state.connecting;
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
  const redis = await getRedis();

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
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    console.error("[redis] cache invalidation failed; entries will expire by TTL", error);
  }
}