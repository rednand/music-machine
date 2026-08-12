export type HistoricalEventCategory =
  | "politics"
  | "culture"
  | "technology"
  | "music"
  | "film"
  | "television"
  | "society"
  | "fashion"
  | "historical";

export interface HistoricalEvent {
  id: string;
  title: string;
  date: Date;
  category: HistoricalEventCategory;
  relevanceScore: number;
  summary: string;
  sourceId: string;
}

export interface CurationOptions {
  maxPerCategory?: number;
  maxTotal?: number;
  maxDateDistanceDays?: number;
}

const DEFAULT_OPTIONS: Required<CurationOptions> = {
  maxPerCategory: 2,
  maxTotal: 8,
  maxDateDistanceDays: 365
};

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000);
}

export function curateHistoricalEvents(
  candidates: HistoricalEvent[],
  targetDate: Date,
  options: CurationOptions = {}
): HistoricalEvent[] {
  const { maxPerCategory, maxTotal, maxDateDistanceDays } = { ...DEFAULT_OPTIONS, ...options };

  const scored = candidates
    .map((event) => {
      const distanceDays = daysBetween(event.date, targetDate);
      const recencyWeight = Math.max(0, 1 - distanceDays / maxDateDistanceDays);
      return { event, distanceDays, score: event.relevanceScore * recencyWeight };
    })
    .filter(({ distanceDays }) => distanceDays <= maxDateDistanceDays);

  const byCategory = new Map<string, typeof scored>();
  for (const item of scored) {
    const bucket = byCategory.get(item.event.category) ?? [];
    bucket.push(item);
    byCategory.set(item.event.category, bucket);
  }

  const cappedPerCategory = [...byCategory.values()].flatMap((bucket) =>
    bucket.sort((a, b) => b.score - a.score).slice(0, maxPerCategory)
  );

  return cappedPerCategory
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTotal)
    .map((item) => item.event);
}
