import "server-only";

import { getOpenJobs, type JobPosting } from "@startup-atlas/db";
import { cachedJson, cityJobsCacheKey } from "./cache";

export function getCachedOpenJobs(cityId: string): Promise<JobPosting[]> {
  return cachedJson(cityJobsCacheKey(cityId), () => getOpenJobs(cityId));
}