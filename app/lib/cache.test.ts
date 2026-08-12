import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PROVIDER_REVALIDATE_SECONDS, cachedFetch } from "./cache";

describe("cachedFetch", () => {
  it("calls fetch with a Next.js revalidate option merged into init", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}"));

    await cachedFetch("https://example.com/api", undefined, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({ next: { revalidate: DEFAULT_PROVIDER_REVALIDATE_SECONDS } })
    );
  });

  it("merges a custom revalidate window and preserves other init fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}"));

    await cachedFetch(
      "https://example.com/api",
      { headers: { "User-Agent": "test" }, revalidateSeconds: 60 },
      fetchImpl
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({
        headers: { "User-Agent": "test" },
        next: { revalidate: 60 }
      })
    );
  });
});
