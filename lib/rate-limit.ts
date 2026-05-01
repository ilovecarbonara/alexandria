import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Database-backed sliding window rate limiter
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Lazy cleanup: prune expired entries at most once per 60 seconds
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

/**
 * Check (and consume) one request against a sliding window rate limit.
 *
 * @param key   Unique key identifying the limiter bucket (e.g. `"signin:<ip>"`).
 * @param opts  `{ limit, windowMs }` configuration for this bucket.
 * @returns     `{ success, remaining }` — `success` is false when the limit is exceeded.
 */
function memoryRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  // First request or window expired — start a fresh window
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { success: true, remaining: opts.limit - 1 };
  }

  // Window still active
  if (entry.count < opts.limit) {
    entry.count += 1;
    return { success: true, remaining: opts.limit - entry.count };
  }

  // Limit exceeded
  return { success: false, remaining: 0 };
}

export async function rateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .rpc("consume_rate_limit", {
        p_key: key,
        p_limit: opts.limit,
        p_window_ms: opts.windowMs,
      })
      .single();

    if (error || !data) {
      console.error("Database rate limit check failed:", error);
      return memoryRateLimit(key, opts);
    }

    return {
      success: data.success,
      remaining: data.remaining,
    };
  } catch (err) {
    console.error("Database rate limit check failed:", err);
    return memoryRateLimit(key, opts);
  }
}

/**
 * Extract the client IP address from request headers.
 * Falls back to `"unknown"` if no IP header is present.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
