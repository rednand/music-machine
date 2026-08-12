import { describe, expect, it } from "vitest";
import { curateHistoricalEvents } from "./historical-events";
import type { HistoricalEvent } from "./historical-events";

function event(overrides: Partial<HistoricalEvent>): HistoricalEvent {
  return {
    id: overrides.id ?? Math.random().toString(36),
    title: overrides.title ?? "Untitled event",
    date: overrides.date ?? new Date("1986-02-04"),
    category: overrides.category ?? "culture",
    relevanceScore: overrides.relevanceScore ?? 0.5,
    summary: overrides.summary ?? "summary",
    sourceId: overrides.sourceId ?? "source-1"
  };
}

describe("curateHistoricalEvents", () => {
  const targetDate = new Date("1986-02-04");

  it("excludes events outside the date-distance window", () => {
    const nearEvent = event({ id: "near", date: new Date("1986-01-15") });
    const farEvent = event({ id: "far", date: new Date("1990-01-01") });

    const curated = curateHistoricalEvents([nearEvent, farEvent], targetDate, { maxDateDistanceDays: 90 });

    expect(curated.map((e) => e.id)).toEqual(["near"]);
  });

  it("caps the number of events per category", () => {
    const musicEvents = Array.from({ length: 5 }, (_, i) =>
      event({ id: `music-${i}`, category: "music", relevanceScore: 0.9 - i * 0.05 })
    );

    const curated = curateHistoricalEvents(musicEvents, targetDate, { maxPerCategory: 2, maxTotal: 10 });

    expect(curated).toHaveLength(2);
    expect(curated.map((e) => e.id)).toEqual(["music-0", "music-1"]);
  });

  it("caps the overall total across categories and never pads with low-relevance filler", () => {
    const events = [
      event({ id: "music-1", category: "music", relevanceScore: 0.9 }),
      event({ id: "film-1", category: "film", relevanceScore: 0.8 }),
      event({ id: "tech-1", category: "technology", relevanceScore: 0.1 })
    ];

    const curated = curateHistoricalEvents(events, targetDate, { maxTotal: 2, maxPerCategory: 5 });

    expect(curated).toHaveLength(2);
    expect(curated.map((e) => e.id)).toEqual(["music-1", "film-1"]);
  });

  it("returns an empty list rather than fabricated filler when nothing qualifies", () => {
    expect(curateHistoricalEvents([], targetDate, {})).toEqual([]);
  });

  it("ranks events closer to the target date higher when relevance scores are equal", () => {
    const closeEvent = event({ id: "close", date: new Date("1986-02-01"), relevanceScore: 0.5 });
    const distantEvent = event({ id: "distant", date: new Date("1986-06-01"), relevanceScore: 0.5 });

    const curated = curateHistoricalEvents([distantEvent, closeEvent], targetDate, { maxDateDistanceDays: 200 });

    expect(curated[0].id).toBe("close");
  });
});
