const DEFAULT_WINDOW_YEARS = 1;

export function isSameEra(a: Date, b: Date, windowYears: number = DEFAULT_WINDOW_YEARS): boolean {
  return Math.abs(a.getUTCFullYear() - b.getUTCFullYear()) <= windowYears;
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
