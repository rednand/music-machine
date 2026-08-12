import type { AlbumRow, ArtistRow } from "../db/album";

export interface DiscoveryPageEntry {
  albumId: string;
  title: string;
  artistName: string;
  releaseYear: string;
  coverArtUrl?: string;
  hook: string | null;
}

export type DiscoveryPageResult =
  | { state: "empty" }
  | { state: "ready"; featured: DiscoveryPageEntry; collection: DiscoveryPageEntry[] };

export interface CollectionDeps {
  findAlbumsOrderedByCreatedAt(): Promise<AlbumRow[]>;
  findArtistById(artistId: string): Promise<ArtistRow | null>;
  deriveHook(albumId: string): Promise<string | null>;
}

async function toEntry(album: AlbumRow, deps: CollectionDeps): Promise<DiscoveryPageEntry> {
  const [artist, hook] = await Promise.all([deps.findArtistById(album.artist_id), deps.deriveHook(album.id)]);

  return {
    albumId: album.id,
    title: album.title,
    artistName: artist?.name ?? "",
    releaseYear: album.release_date.slice(0, 4),
    coverArtUrl: album.cover_art_url,
    hook
  };
}

export async function buildDiscoveryPage(deps: CollectionDeps): Promise<DiscoveryPageResult> {
  const albums = await deps.findAlbumsOrderedByCreatedAt();
  if (albums.length === 0) {
    return { state: "empty" };
  }

  const collection = await Promise.all(albums.map((album) => toEntry(album, deps)));

  return { state: "ready", featured: collection[0], collection };
}
