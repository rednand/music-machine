import type { AlbumRow, ArtistRow } from "../db/album";
import type { HistoricalEventRef } from "../ai/narrative";
import type { DiscoveryPageEntry } from "./collection";

export interface YearAlbumEntry extends DiscoveryPageEntry {
  releaseDate: string;
}

export type YearTimelineItem =
  | { kind: "event"; date: string; title: string }
  | { kind: "album"; date: string; album: YearAlbumEntry };

export type YearPageResult =
  | { state: "invalid" }
  | {
      state: "ready";
      year: string;
      albums: YearAlbumEntry[];
      historicalEvents: HistoricalEventRef[];
      timeline: YearTimelineItem[];
    };

export interface YearPageDeps {
  findAlbumsByReleaseYear(year: string): Promise<AlbumRow[]>;
  findArtistById(artistId: string): Promise<ArtistRow | null>;
  deriveHook(albumId: string): Promise<string | null>;
  findHistoricalEvents(date: string): Promise<HistoricalEventRef[]>;
}

const YEAR_PATTERN = /^\d{4}$/;
const MIN_YEAR = 1900;

function isValidYear(year: string): boolean {
  if (!YEAR_PATTERN.test(year)) {
    return false;
  }
  const numeric = Number(year);
  return numeric >= MIN_YEAR && numeric <= new Date().getFullYear();
}

async function toEntry(album: AlbumRow, deps: YearPageDeps): Promise<YearAlbumEntry> {
  const [artist, hook] = await Promise.all([deps.findArtistById(album.artist_id), deps.deriveHook(album.id)]);

  return {
    albumId: album.id,
    title: album.title,
    artistName: artist?.name ?? "",
    releaseYear: album.release_date.slice(0, 4),
    releaseDate: album.release_date,
    coverArtUrl: album.cover_art_url,
    hook
  };
}

export async function buildYearPage(year: string, deps: YearPageDeps): Promise<YearPageResult> {
  if (!isValidYear(year)) {
    return { state: "invalid" };
  }

  const [albumRows, firstHalfEvents, secondHalfEvents] = await Promise.all([
    deps.findAlbumsByReleaseYear(year),
    deps.findHistoricalEvents(`${year}-03-01`),
    deps.findHistoricalEvents(`${year}-09-01`)
  ]);

  const albums = await Promise.all(albumRows.map((album) => toEntry(album, deps)));

  const seenTitles = new Set<string>();
  const historicalEvents = [...firstHalfEvents, ...secondHalfEvents].filter((event) => {
    const key = event.title.toLowerCase();
    if (seenTitles.has(key)) {
      return false;
    }
    seenTitles.add(key);
    return true;
  });

  const timeline: YearTimelineItem[] = [
    ...historicalEvents.map((event): YearTimelineItem => ({ kind: "event", date: event.date, title: event.title })),
    ...albums.map((album): YearTimelineItem => ({ kind: "album", date: album.releaseDate, album }))
  ].sort((a, b) => a.date.localeCompare(b.date));

  return { state: "ready", year, albums, historicalEvents, timeline };
}
