// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import * as albumDb from "../lib/db/album";
import { searchSongs } from "./song-search";

vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({})
}));

describe("searchSongs", () => {
  it("returns matching songs disambiguated by album and artist", async () => {
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({
      findTracksByTitle: vi.fn().mockResolvedValue([{ id: "track-1", album_id: "album-1", title: "Nasty", track_number: 2 }]),
      findAlbumById: vi.fn().mockResolvedValue({ id: "album-1", artist_id: "artist-1", title: "Control", release_date: "1986-02-04" }),
      findArtistById: vi.fn().mockResolvedValue({ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" })
    } as never);

    const results = await searchSongs("Nasty");

    expect(results).toEqual([
      { trackId: "track-1", title: "Nasty", albumId: "album-1", albumTitle: "Control", artistName: "Janet Jackson" }
    ]);
  });

  it("returns an empty array when nothing matches", async () => {
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({
      findTracksByTitle: vi.fn().mockResolvedValue([]),
      findAlbumById: vi.fn(),
      findArtistById: vi.fn()
    } as never);

    expect(await searchSongs("nothing")).toEqual([]);
  });

  it("returns an empty array for a blank query without hitting the database", async () => {
    const spy = vi.spyOn(albumDb, "createAlbumRepository");

    expect(await searchSongs("   ")).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
