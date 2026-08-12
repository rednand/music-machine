import { describe, expect, it, vi } from "vitest";
import { InMemoryRateLimiter } from "./rate-limit";

describe("InMemoryRateLimiter", () => {
  it("allows requests within the configured limit", () => {
    const limiter = new InMemoryRateLimiter();

    const first = limiter.checkAndIncrement("1.2.3.4", { maxRequests: 2, windowSeconds: 60 });
    const second = limiter.checkAndIncrement("1.2.3.4", { maxRequests: 2, windowSeconds: 60 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("rejects requests once the limit is exceeded within the window", () => {
    const limiter = new InMemoryRateLimiter();
    const config = { maxRequests: 2, windowSeconds: 60 };

    limiter.checkAndIncrement("1.2.3.4", config);
    limiter.checkAndIncrement("1.2.3.4", config);
    const third = limiter.checkAndIncrement("1.2.3.4", config);

    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate clients independently", () => {
    const limiter = new InMemoryRateLimiter();
    const config = { maxRequests: 1, windowSeconds: 60 };

    limiter.checkAndIncrement("1.2.3.4", config);
    const otherClient = limiter.checkAndIncrement("5.6.7.8", config);

    expect(otherClient.allowed).toBe(true);
  });

  it("resets the count after the window elapses", () => {
    const now = vi.fn().mockReturnValue(0);
    const limiter = new InMemoryRateLimiter(now);
    const config = { maxRequests: 1, windowSeconds: 60 };

    limiter.checkAndIncrement("1.2.3.4", config);
    now.mockReturnValue(61_000);
    const afterWindow = limiter.checkAndIncrement("1.2.3.4", config);

    expect(afterWindow.allowed).toBe(true);
  });
});
