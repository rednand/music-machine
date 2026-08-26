import type { AlbumRow, ArtistRow } from "../db/album";

export interface DiscoveryPageEntry {
  albumId: string;
  title: string;
  artistName: string;
  releaseYear: string;
  coverArtUrl?: string;
  genre?: string;
  hook: string | null;
}

export type DiscoveryPageResult =
  | { state: "empty" }
  | { state: "ready"; featured: DiscoveryPageEntry; collection: DiscoveryPageEntry[] };

export interface CollectionDeps {
  findAlbumsOrderedByCreatedAt(): Promise<AlbumRow[]>;
  findArtistsByIds(artistIds: string[]): Promise<ArtistRow[]>;
  deriveHooksBatch(albumIds: string[]): Promise<Map<string, string | null>>;
}

function toEntry(
  album: AlbumRow,
  artistsById: Map<string, ArtistRow>,
  hooksByAlbumId: Map<string, string | null>
): DiscoveryPageEntry {
  return {
    albumId: album.id,
    title: album.title,
    artistName: artistsById.get(album.artist_id)?.name ?? "",
    releaseYear: album.release_date.slice(0, 4),
    coverArtUrl: album.cover_art_url,
    genre: album.genre,
    hook: hooksByAlbumId.get(album.id) ?? null
  };
}

export async function buildDiscoveryPage(deps: CollectionDeps): Promise<DiscoveryPageResult> {
  const albums = await deps.findAlbumsOrderedByCreatedAt();
  if (albums.length === 0) {
    return { state: "empty" };
  }

  const artistIds = Array.from(new Set(albums.map((album) => album.artist_id)));
  const albumIds = albums.map((album) => album.id);

  const [artists, hooksByAlbumId] = await Promise.all([
    deps.findArtistsByIds(artistIds),
    deps.deriveHooksBatch(albumIds)
  ]);
  const artistsById = new Map(artists.map((artist) => [artist.id, artist]));

  const collection = albums.map((album) => toEntry(album, artistsById, hooksByAlbumId));

  return { state: "ready", featured: collection[0], collection };
}

export function shuffleEntries(collection: DiscoveryPageEntry[], count: number = collection.length): DiscoveryPageEntry[] {
  const shuffled = [...collection];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
