import type { RawAlbumData } from "../providers/provider.interface";
import type { AlbumRow, ArtistRow, CreateAlbumInput, CreateArtistInput } from "../db/album";

export interface SearchFallbackDeps {
  findArtistByName(name: string): Promise<ArtistRow | null>;
  createArtist(input: CreateArtistInput): Promise<ArtistRow>;
  findAlbumBySlug(slug: string): Promise<AlbumRow | null>;
  createAlbum(input: CreateAlbumInput): Promise<AlbumRow>;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasRequiredFields(candidate: RawAlbumData): boolean {
  return Boolean(candidate.title && candidate.artistName && candidate.releaseDate);
}

async function resolveArtist(candidate: RawAlbumData, deps: SearchFallbackDeps): Promise<ArtistRow> {
  const existing = await deps.findArtistByName(candidate.artistName);
  if (existing) {
    return existing;
  }
  return deps.createArtist({ name: candidate.artistName, slug: slugify(candidate.artistName) });
}

export async function ingestSingleCandidate(
  candidate: RawAlbumData,
  deps: SearchFallbackDeps
): Promise<AlbumRow | null> {
  if (!hasRequiredFields(candidate)) {
    return null;
  }

  const albumSlug = slugify(`${candidate.artistName}-${candidate.title}`);
  const existingAlbum = await deps.findAlbumBySlug(albumSlug);
  if (existingAlbum) {
    return existingAlbum;
  }

  const artist = await resolveArtist(candidate, deps);

  return deps.createAlbum({
    artist_id: artist.id,
    title: candidate.title,
    slug: albumSlug,
    release_date: candidate.releaseDate,
    genre: candidate.genre,
    label: candidate.label,
    duration_seconds: candidate.durationSeconds,
    track_count: candidate.trackCount,
    cover_art_url: candidate.coverArtUrl
  });
}
