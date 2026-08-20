import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createAlbumRepository } from "./album";

describe("AlbumRepository", () => {
  it("creates and finds an album by id", async () => {
    const supabase = createFakeSupabase({});
    const repo = createAlbumRepository(supabase as never);

    const created = await repo.createAlbum({
      artist_id: "artist-1",
      title: "Control",
      slug: "janet-jackson-control",
      release_date: "1986-02-04",
      genre: "Funk / Soul",
      label: "A&M Records"
    });

    const found = await repo.findAlbumById(created.id as string);

    expect(found).toEqual(expect.objectContaining({ title: "Control" }));
  });

  it("searches albums by title, case-insensitively", async () => {
    const supabase = createFakeSupabase({});
    const repo = createAlbumRepository(supabase as never);

    await repo.createAlbum({
      artist_id: "artist-1",
      title: "Control",
      slug: "janet-jackson-control",
      release_date: "1986-02-04"
    });

    const results = await repo.searchAlbums("control");

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Control");
  });

  it("returns an empty array when no album matches the search", async () => {
    const supabase = createFakeSupabase({});
    const repo = createAlbumRepository(supabase as never);

    expect(await repo.searchAlbums("nothing")).toEqual([]);
  });

  it("creates tracks and credits linked to an album", async () => {
    const supabase = createFakeSupabase({});
    const repo = createAlbumRepository(supabase as never);

    const album = await repo.createAlbum({
      artist_id: "artist-1",
      title: "Control",
      slug: "janet-jackson-control",
      release_date: "1986-02-04"
    });

    await repo.createTrack({ album_id: album.id as string, title: "Control", track_number: 1 });
    await repo.createCredit({
      album_id: album.id as string,
      person_name: "Jimmy Jam",
      role: "Producer",
      source_id: "source-1"
    });

    const credits = await repo.findCreditsByAlbumId(album.id as string);

    expect(credits).toEqual([expect.objectContaining({ person_name: "Jimmy Jam", role: "Producer" })]);
  });

  it("returns the already-persisted track instead of throwing when a concurrent insert already created it", async () => {
    const existingTrack = { id: "track-1", album_id: "album-1", title: "Jam", track_number: 1, duration_seconds: 340 };
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { code: "23505", message: "duplicate key value" } })
          })
        }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: existingTrack, error: null })
            })
          })
        })
      })
    };
    const repo = createAlbumRepository(supabase as never);

    const result = await repo.createTrack({ album_id: "album-1", title: "Jam", track_number: 1, duration_seconds: 340 });

    expect(result).toEqual(existingTrack);
  });

  it("returns the already-persisted credit instead of throwing when a concurrent insert already created it", async () => {
    const existingCredit = { id: "credit-1", album_id: "album-1", person_name: "Jimmy Jam", role: "Producer", source_id: "source-1" };
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { code: "23505", message: "duplicate key value" } })
          })
        }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: existingCredit, error: null })
              })
            })
          })
        })
      })
    };
    const repo = createAlbumRepository(supabase as never);

    const result = await repo.createCredit({
      album_id: "album-1",
      person_name: "Jimmy Jam",
      role: "Producer",
      source_id: "source-2"
    });

    expect(result).toEqual(existingCredit);
  });

  it("still throws for a genuine failure that isn't a unique-constraint conflict", async () => {
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { code: "500", message: "connection reset" } })
          })
        })
      })
    };
    const repo = createAlbumRepository(supabase as never);

    await expect(repo.createTrack({ album_id: "album-1", title: "Jam", track_number: 1 })).rejects.toThrow();
  });

  it("lists all albums", async () => {
    const supabase = createFakeSupabase({});
    const repo = createAlbumRepository(supabase as never);

    await repo.createAlbum({ artist_id: "artist-1", title: "Control", slug: "control", release_date: "1986-02-04" });
    await repo.createAlbum({ artist_id: "artist-2", title: "True Blue", slug: "true-blue", release_date: "1986-06-30" });

    const all = await repo.findAllAlbums();

    expect(all).toHaveLength(2);
  });

  it("searches artists by name", async () => {
    const supabase = createFakeSupabase({ artists: [{ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" }] });
    const repo = createAlbumRepository(supabase as never);

    const results = await repo.searchArtists("janet");

    expect(results).toEqual([expect.objectContaining({ name: "Janet Jackson" })]);
  });

  it("creates an artist and finds it by exact name", async () => {
    const supabase = createFakeSupabase({});
    const repo = createAlbumRepository(supabase as never);

    await repo.createArtist({ name: "Prince", slug: "prince" });

    const found = await repo.findArtistByName("Prince");

    expect(found).toEqual(expect.objectContaining({ name: "Prince", slug: "prince" }));
  });

  it("returns null when no artist matches the exact name", async () => {
    const supabase = createFakeSupabase({});
    const repo = createAlbumRepository(supabase as never);

    expect(await repo.findArtistByName("Nobody")).toBeNull();
  });

  it("finds an album by its exact slug", async () => {
    const supabase = createFakeSupabase({});
    const repo = createAlbumRepository(supabase as never);

    await repo.createAlbum({
      artist_id: "artist-1",
      title: "Control",
      slug: "janet-jackson-control",
      release_date: "1986-02-04"
    });

    const found = await repo.findAlbumBySlug("janet-jackson-control");

    expect(found).toEqual(expect.objectContaining({ title: "Control" }));
    expect(await repo.findAlbumBySlug("nothing-here")).toBeNull();
  });

  it("orders albums by created_at descending, most recently added first", async () => {
    const supabase = createFakeSupabase({
      albums: [
        { id: "album-1", artist_id: "artist-1", title: "Control", slug: "control", release_date: "1986-02-04", created_at: "2026-08-10T00:00:00.000Z" },
        { id: "album-2", artist_id: "artist-2", title: "True Blue", slug: "true-blue", release_date: "1986-06-30", created_at: "2026-08-12T00:00:00.000Z" }
      ]
    });
    const repo = createAlbumRepository(supabase as never);

    const ordered = await repo.findAlbumsOrderedByCreatedAt();

    expect(ordered.map((a) => a.id)).toEqual(["album-2", "album-1"]);
  });

  it("breaks a created_at tie by title ascending, deterministically", async () => {
    const supabase = createFakeSupabase({
      albums: [
        { id: "album-1", artist_id: "artist-1", title: "Zeta", slug: "zeta", release_date: "1986-02-04", created_at: "2026-08-12T00:00:00.000Z" },
        { id: "album-2", artist_id: "artist-2", title: "Alpha", slug: "alpha", release_date: "1986-06-30", created_at: "2026-08-12T00:00:00.000Z" }
      ]
    });
    const repo = createAlbumRepository(supabase as never);

    const ordered = await repo.findAlbumsOrderedByCreatedAt();

    expect(ordered.map((a) => a.title)).toEqual(["Alpha", "Zeta"]);
  });

  it("finds an artist's albums ordered by release date ascending", async () => {
    const supabase = createFakeSupabase({
      albums: [
        { id: "album-1", artist_id: "artist-1", title: "Rhythm Nation 1814", slug: "rn1814", release_date: "1989-09-19" },
        { id: "album-2", artist_id: "artist-1", title: "Control", slug: "control", release_date: "1986-02-04" },
        { id: "album-3", artist_id: "artist-2", title: "True Blue", slug: "true-blue", release_date: "1986-06-30" }
      ]
    });
    const repo = createAlbumRepository(supabase as never);

    const albums = await repo.findAlbumsByArtistId("artist-1");

    expect(albums.map((a) => a.title)).toEqual(["Control", "Rhythm Nation 1814"]);
  });

  it("lists all artists ordered by name ascending", async () => {
    const supabase = createFakeSupabase({
      artists: [
        { id: "artist-1", name: "Prince", slug: "prince" },
        { id: "artist-2", name: "Janet Jackson", slug: "janet-jackson" }
      ]
    });
    const repo = createAlbumRepository(supabase as never);

    const artists = await repo.findAllArtists();

    expect(artists.map((a) => a.name)).toEqual(["Janet Jackson", "Prince"]);
  });

  it("finds an album's tracks ordered by track number ascending", async () => {
    const supabase = createFakeSupabase({
      tracks: [
        { id: "track-2", album_id: "album-1", title: "Nasty", track_number: 2 },
        { id: "track-1", album_id: "album-1", title: "Control", track_number: 1 },
        { id: "track-3", album_id: "album-2", title: "Other Album Track", track_number: 1 }
      ]
    });
    const repo = createAlbumRepository(supabase as never);

    const tracks = await repo.findTracksByAlbumId("album-1");

    expect(tracks.map((t) => t.title)).toEqual(["Control", "Nasty"]);
  });

  it("finds tracks by title, case-insensitively", async () => {
    const supabase = createFakeSupabase({
      tracks: [{ id: "track-1", album_id: "album-1", title: "Nasty", track_number: 2 }]
    });
    const repo = createAlbumRepository(supabase as never);

    const tracks = await repo.findTracksByTitle("nasty");

    expect(tracks).toEqual([expect.objectContaining({ title: "Nasty" })]);
    expect(await repo.findTracksByTitle("nothing")).toEqual([]);
  });
});
