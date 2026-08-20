import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createDiscographyCacheRepository } from "./discography-cache";

describe("DiscographyCacheRepository", () => {
  it("returns null when nothing is cached for the artist yet", async () => {
    const supabase = createFakeSupabase({});
    const repo = createDiscographyCacheRepository(supabase as never);

    expect(await repo.findByArtistId("artist-1")).toBeNull();
  });

  it("saves and retrieves the full discography for an artist", async () => {
    const supabase = createFakeSupabase({});
    const repo = createDiscographyCacheRepository(supabase as never);

    await repo.save("artist-1", [
      { title: "Like a Virgin", releaseYear: "1984", externalId: "spotify-1" },
      { title: "True Blue", releaseYear: "1986", externalId: "spotify-2" }
    ]);

    const cached = await repo.findByArtistId("artist-1");

    expect(cached).toEqual([
      { title: "Like a Virgin", releaseYear: "1984", externalId: "spotify-1" },
      { title: "True Blue", releaseYear: "1986", externalId: "spotify-2" }
    ]);
  });

  it("does not write anything when saving an empty discography", async () => {
    const supabase = createFakeSupabase({});
    const repo = createDiscographyCacheRepository(supabase as never);

    await repo.save("artist-1", []);

    expect(await repo.findByArtistId("artist-1")).toBeNull();
  });

  it("keeps discography entries scoped to their own artist", async () => {
    const supabase = createFakeSupabase({});
    const repo = createDiscographyCacheRepository(supabase as never);

    await repo.save("artist-1", [{ title: "Like a Virgin", releaseYear: "1984", externalId: "spotify-1" }]);
    await repo.save("artist-2", [{ title: "Control", releaseYear: "1986", externalId: "spotify-9" }]);

    expect(await repo.findByArtistId("artist-1")).toEqual([
      { title: "Like a Virgin", releaseYear: "1984", externalId: "spotify-1" }
    ]);
  });
});
