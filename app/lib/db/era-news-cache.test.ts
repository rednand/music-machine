import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createEraNewsCacheRepository } from "./era-news-cache";

describe("EraNewsCacheRepository", () => {
  it("returns null when nothing is cached for the album yet", async () => {
    const supabase = createFakeSupabase({});
    const repo = createEraNewsCacheRepository(supabase as never);

    expect(await repo.findByAlbumId("album-1")).toBeNull();
  });

  it("saves and retrieves the cached news for an album", async () => {
    const supabase = createFakeSupabase({});
    const repo = createEraNewsCacheRepository(supabase as never);

    await repo.save("album-1", [
      { title: "Janet Jackson anuncia turnê de relançamento", date: "2024-03-15", url: "https://example.com/a" }
    ]);

    const cached = await repo.findByAlbumId("album-1");

    expect(cached).toEqual([
      { title: "Janet Jackson anuncia turnê de relançamento", date: "2024-03-15", url: "https://example.com/a" }
    ]);
  });

  it("does not write anything when saving an empty list", async () => {
    const supabase = createFakeSupabase({});
    const repo = createEraNewsCacheRepository(supabase as never);

    await repo.save("album-1", []);

    expect(await repo.findByAlbumId("album-1")).toBeNull();
  });

  it("keeps cached news scoped to their own album", async () => {
    const supabase = createFakeSupabase({});
    const repo = createEraNewsCacheRepository(supabase as never);

    await repo.save("album-1", [{ title: "Notícia do álbum 1", date: "2024-03-15", url: "https://example.com/a" }]);
    await repo.save("album-2", [{ title: "Notícia do álbum 2", date: "2020-01-01", url: "https://example.com/b" }]);

    expect(await repo.findByAlbumId("album-1")).toEqual([
      { title: "Notícia do álbum 1", date: "2024-03-15", url: "https://example.com/a" }
    ]);
  });
});
