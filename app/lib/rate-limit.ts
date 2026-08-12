export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

interface WindowState {
  count: number;
  windowStartedAt: number;
}

export class InMemoryRateLimiter {
  private readonly windows = new Map<string, WindowState>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  checkAndIncrement(key: string, config: RateLimitConfig): RateLimitResult {
    const nowMs = this.now();
    const windowMs = config.windowSeconds * 1000;
    const state = this.windows.get(key);

    if (!state || nowMs - state.windowStartedAt >= windowMs) {
      this.windows.set(key, { count: 1, windowStartedAt: nowMs });
      return { allowed: true };
    }

    if (state.count >= config.maxRequests) {
      const retryAfterSeconds = Math.ceil((state.windowStartedAt + windowMs - nowMs) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
    }

    state.count += 1;
    return { allowed: true };
  }
}
