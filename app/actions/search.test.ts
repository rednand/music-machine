import { describe, expect, it, vi } from "vitest";
import { resolveSearchCandidate, searchCatalog } from "./search";
import * as albumDb from "../lib/db/album";
import * as searchFallback from "../lib/ingestion/search-fallback";
import { CatalogProvider } from "../lib/providers/catalog-provider";

vi.mock("server-only", () => ({}));

vi.mock("../lib/supabase/server.js", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({})
}));

vi.mock("../lib/supabase/admin.js", () => ({
  createSupabaseAdminClient: vi.fn().mockReturnValue({})
}));

function rawCandidate(overrides: Record<string, unknown> = {}) {
  return {
    title: "Rhythm Nation 1814",
    externalId: "cat-9",
    artistName: "Janet Jackson",
    releaseDate: "1989-09-19",
    coverArtUrl: "https://example.com/rn1814.jpg",
    source: { providerName: "catalog", url: "x", retrievedAt: "now" },
    ...overrides
  };
}

describe("searchCatalog", () => {
  it("returns known album results matching by title", async () => {
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({
      searchAlbums: vi.fn().mockResolvedValue([
        { id: "album-1", title: "Control", artist_id: "artist-1", release_date: "1986-02-04", cover_art_url: "x" }
      ]),
      searchArtists: vi.fn().mockResolvedValue([]),
      findArtistById: vi.fn().mockResolvedValue({ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" })
    } as never);

    const results = await searchCatalog("Control");

    expect(results).toEqual([
      expect.objectContaining({ kind: "known", id: "album-1", title: "Control", artistName: "Janet Jackson" })
    ]);
  });

  it("resolves an artist-name match into that artist's actual albums, not a dead artist link", async () => {
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({
      searchAlbums: vi.fn().mockResolvedValue([]),
      searchArtists: vi.fn().mockResolvedValue([{ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" }]),
      findAlbumsByArtistId: vi.fn().mockResolvedValue([
        { id: "album-1", title: "Control", artist_id: "artist-1", release_date: "1986-02-04" }
      ]),
      findArtistById: vi.fn().mockResolvedValue({ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" })
    } as never);

    const results = await searchCatalog("Janet Jackson");

    expect(results).toEqual([
      expect.objectContaining({ kind: "known", id: "album-1", title: "Control", artistName: "Janet Jackson" })
    ]);
  });

  it("deduplicates an album matched both by title and by its artist's name", async () => {
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({
      searchAlbums: vi.fn().mockResolvedValue([
        { id: "album-1", title: "Control", artist_id: "artist-1", release_date: "1986-02-04" }
      ]),
      searchArtists: vi.fn().mockResolvedValue([{ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" }]),
      findAlbumsByArtistId: vi.fn().mockResolvedValue([
        { id: "album-1", title: "Control", artist_id: "artist-1", release_date: "1986-02-04" }
      ]),
      findArtistById: vi.fn().mockResolvedValue({ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" })
    } as never);

    const results = await searchCatalog("Control");

    expect(results).toHaveLength(1);
  });

  it("returns an empty array for a blank query without hitting the database", async () => {
    const spy = vi.spyOn(albumDb, "createAlbumRepository");

    const results = await searchCatalog("   ");

    expect(results).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns unsaved candidate results when the local catalog has zero matches, without persisting them", async () => {
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({
      searchAlbums: vi.fn().mockResolvedValue([]),
      searchArtists: vi.fn().mockResolvedValue([]),
      createAlbum: vi.fn(),
      createArtist: vi.fn()
    } as never);
    vi.spyOn(CatalogProvider.prototype, "searchByText").mockResolvedValue([
      rawCandidate(),
      rawCandidate({ externalId: "cat-10", title: "Rhythm Nation 1814 (Deluxe)" })
    ] as never);

    const results = await searchCatalog("Rhythm Nation");

    expect(results).toEqual([
      expect.objectContaining({ kind: "candidate", externalId: "cat-9", title: "Rhythm Nation 1814", query: "Rhythm Nation" }),
      expect.objectContaining({ kind: "candidate", externalId: "cat-10" })
    ]);
    const repo = albumDb.createAlbumRepository as unknown as ReturnType<typeof vi.fn>;
    const lastRepo = repo.mock.results.at(-1)?.value;
    expect(lastRepo.createAlbum).not.toHaveBeenCalled();
    expect(lastRepo.createArtist).not.toHaveBeenCalled();
  });

  it("does not call the external provider when the local catalog already has matches", async () => {
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({
      searchAlbums: vi.fn().mockResolvedValue([
        { id: "album-1", title: "Control", artist_id: "artist-1", release_date: "1986-02-04" }
      ]),
      searchArtists: vi.fn().mockResolvedValue([]),
      findArtistById: vi.fn().mockResolvedValue({ id: "artist-1", name: "Janet Jackson", slug: "janet-jackson" })
    } as never);
    const providerSpy = vi.spyOn(CatalogProvider.prototype, "searchByText");

    await searchCatalog("Control");

    expect(providerSpy).not.toHaveBeenCalled();
  });

  it("returns an empty array when neither the local catalog nor the provider find anything", async () => {
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({
      searchAlbums: vi.fn().mockResolvedValue([]),
      searchArtists: vi.fn().mockResolvedValue([])
    } as never);
    vi.spyOn(CatalogProvider.prototype, "searchByText").mockResolvedValue([]);

    expect(await searchCatalog("asdkjhaskjdh nonsense")).toEqual([]);
  });
});

describe("resolveSearchCandidate", () => {
  it("re-derives the candidate server-side and saves only the matched one", async () => {
    vi.spyOn(CatalogProvider.prototype, "searchByText").mockResolvedValue([
      rawCandidate(),
      rawCandidate({ externalId: "cat-10", title: "Something Else" })
    ] as never);
    vi.spyOn(searchFallback, "ingestSingleCandidate").mockResolvedValue({
      id: "album-new",
      artist_id: "artist-new",
      title: "Rhythm Nation 1814",
      slug: "janet-jackson-rhythm-nation-1814",
      release_date: "1989-09-19"
    });
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({} as never);

    const result = await resolveSearchCandidate("Rhythm Nation", "cat-9");

    expect(result).toEqual({ state: "ready", albumId: "album-new" });
    const [passedCandidate] = (searchFallback.ingestSingleCandidate as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(passedCandidate.externalId).toBe("cat-9");
  });

  it("returns an error when the provider no longer confirms the candidate", async () => {
    vi.spyOn(CatalogProvider.prototype, "searchByText").mockResolvedValue([]);

    const result = await resolveSearchCandidate("Rhythm Nation", "cat-9");

    expect(result.state).toBe("error");
  });

  it("returns an error when ingestion fails to produce an album", async () => {
    vi.spyOn(CatalogProvider.prototype, "searchByText").mockResolvedValue([rawCandidate()] as never);
    vi.spyOn(searchFallback, "ingestSingleCandidate").mockResolvedValue(null);
    vi.spyOn(albumDb, "createAlbumRepository").mockReturnValue({} as never);

    const result = await resolveSearchCandidate("Rhythm Nation", "cat-9");

    expect(result.state).toBe("error");
  });

  it("returns an error instead of throwing when the provider call itself fails", async () => {
    vi.spyOn(CatalogProvider.prototype, "searchByText").mockRejectedValue(new Error("network error"));

    const result = await resolveSearchCandidate("Rhythm Nation", "cat-9");

    expect(result.state).toBe("error");
  });
});
