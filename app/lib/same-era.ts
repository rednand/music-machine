const MILLISECONDS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_YEARS = 2;

export function isSameEra(a: Date, b: Date, windowYears: number = DEFAULT_WINDOW_YEARS): boolean {
  const diffYears = Math.abs(a.getTime() - b.getTime()) / MILLISECONDS_PER_YEAR;
  return diffYears <= windowYears;
}

export interface AlbumWithReleaseDate {
  id: string;
  releaseDate: Date;
}

export function findSameEraAlbums<T extends AlbumWithReleaseDate>(
  target: AlbumWithReleaseDate,
  candidates: T[],
  windowYears: number = DEFAULT_WINDOW_YEARS
): T[] {
  return candidates.filter(
    (candidate) => candidate.id !== target.id && isSameEra(target.releaseDate, candidate.releaseDate, windowYears)
  );
}
