import Redis from "ioredis";
import { POOL_CACHE_TTL } from "@mariposa/core";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env["REDIS_URL"];
  if (!url) return null;

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.warn("[Cache] Redis connection error, falling back to in-memory:", err.message);
      redis?.disconnect();
      redis = null;
    });

    redis.connect().catch(() => {
      redis = null;
    });

    return redis;
  } catch {
    return null;
  }
}

/**
 * Get a cached JSON value from Redis.
 * Returns null if Redis is unavailable or key doesn't exist.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Set a JSON value in Redis with a TTL.
 * Silently fails if Redis is unavailable.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = POOL_CACHE_TTL
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache write failures are non-critical
  }
}
