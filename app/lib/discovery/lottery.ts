import type { AlbumRow, ArtistRow } from "../db/album";
import { normalizeForMatch } from "../db/list-placement";

export interface LotteryPlacementInput {
  list_slug: string;
  list_name: string;
  position: number;
  artist_name: string;
  album_title: string;
  normalized_artist: string;
  normalized_title: string;
}

export interface LotteryCatalogEntry {
  albumId: string;
  title: string;
  artistName: string;
  releaseYear: string;
  genre: string | null;
}

export interface LotteryListMention {
  listName: string;
  position: number;
}

export interface LotteryEntry {
  key: string;
  artistName: string;
  albumTitle: string;
  placements: LotteryListMention[];
  albumId: string | null;
  genre: string | null;
  releaseYear: string | null;
}

export interface LotteryPoolDeps {
  findAllPlacements(): Promise<LotteryPlacementInput[]>;
  findAllAlbums(): Promise<AlbumRow[]>;
  findArtistsByIds(artistIds: string[]): Promise<ArtistRow[]>;
}

function catalogKey(artistName: string, title: string): string {
  return `${normalizeForMatch(artistName)}|${normalizeForMatch(title)}`;
}

export function groupPlacementsIntoPool(
  placements: LotteryPlacementInput[],
  catalog: LotteryCatalogEntry[]
): LotteryEntry[] {
  const catalogByKey = new Map<string, LotteryCatalogEntry>();
  for (const entry of catalog) {
    catalogByKey.set(catalogKey(entry.artistName, entry.title), entry);
  }

  const grouped = new Map<string, LotteryEntry>();
  for (const placement of placements) {
    const key = `${placement.normalized_artist}|${placement.normalized_title}`;
    let entry = grouped.get(key);
    if (!entry) {
      const match = catalogByKey.get(key);
      entry = {
        key,
        artistName: placement.artist_name,
        albumTitle: placement.album_title,
        placements: [],
        albumId: match?.albumId ?? null,
        genre: match?.genre ?? null,
        releaseYear: match?.releaseYear ?? null
      };
      grouped.set(key, entry);
    }
    entry.placements.push({ listName: placement.list_name, position: placement.position });
  }

  return Array.from(grouped.values());
}

export async function buildLotteryPool(deps: LotteryPoolDeps): Promise<LotteryEntry[]> {
  const [placements, albums] = await Promise.all([deps.findAllPlacements(), deps.findAllAlbums()]);

  const artistIds = Array.from(new Set(albums.map((album) => album.artist_id)));
  const artists = await deps.findArtistsByIds(artistIds);
  const artistsById = new Map(artists.map((artist) => [artist.id, artist]));

  const catalog: LotteryCatalogEntry[] = albums.map((album) => ({
    albumId: album.id,
    title: album.title,
    artistName: artistsById.get(album.artist_id)?.name ?? "",
    releaseYear: album.release_date.slice(0, 4),
    genre: album.genre ?? null
  }));

  return groupPlacementsIntoPool(placements, catalog);
}

export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

export function entryDecade(entry: LotteryEntry): string | null {
  if (!entry.releaseYear) {
    return null;
  }
  const year = Number(entry.releaseYear);
  if (Number.isNaN(year)) {
    return null;
  }
  return `${Math.floor(year / 10) * 10}s`;
}

export function availableGenres(pool: LotteryEntry[]): string[] {
  return Array.from(new Set(pool.map((entry) => entry.genre).filter((value): value is string => Boolean(value)))).sort();
}

export function availableDecades(pool: LotteryEntry[]): string[] {
  const decades = new Set<string>();
  for (const entry of pool) {
    const decade = entryDecade(entry);
    if (decade) {
      decades.add(decade);
    }
  }
  return Array.from(decades).sort();
}

export function filterLotteryPool(pool: LotteryEntry[], genre: string | null, decade: string | null): LotteryEntry[] {
  return pool.filter((entry) => {
    const matchesGenre = !genre || entry.genre === genre;
    const matchesDecade = !decade || entryDecade(entry) === decade;
    return matchesGenre && matchesDecade;
  });
}
