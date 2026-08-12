import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createRecommendationRepository, deriveRecommendations } from "./recommendation";

describe("RecommendationRepository", () => {
  it("creates and lists recommendations for a subject album", async () => {
    const supabase = createFakeSupabase({});
    const repo = createRecommendationRepository(supabase as never);

    await repo.create({
      subject_album_id: "control",
      recommended_album_id: "true-blue",
      reason: "same_era",
      explanation: "Lançado na mesma época de Control."
    });

    const results = await repo.findBySubjectAlbumId("control");

    expect(results).toEqual([expect.objectContaining({ recommended_album_id: "true-blue", reason: "same_era" })]);
  });

  it("returns an empty array when an album has no recommendations yet", async () => {
    const supabase = createFakeSupabase({});
    const repo = createRecommendationRepository(supabase as never);

    expect(await repo.findBySubjectAlbumId("obscure-album")).toEqual([]);
  });
});

describe("deriveRecommendations", () => {
  const control = { id: "control", title: "Control", releaseDate: new Date("1986-02-04"), genre: "Funk / Soul" };

  it("prioritizes direct_influence over same_era or genre when an album is a confirmed influence target", () => {
    const trueBlue = { id: "true-blue", title: "True Blue", releaseDate: new Date("1986-06-30"), genre: "Pop" };

    const recommendations = deriveRecommendations(control, [trueBlue], new Set(["true-blue"]));

    expect(recommendations).toEqual([
      expect.objectContaining({ recommended_album_id: "true-blue", reason: "direct_influence" })
    ]);
  });

  it("uses same_era when release dates are close but there is no confirmed influence link", () => {
    const trueBlue = { id: "true-blue", title: "True Blue", releaseDate: new Date("1986-06-30"), genre: "Pop" };

    const recommendations = deriveRecommendations(control, [trueBlue], new Set());

    expect(recommendations).toEqual([
      expect.objectContaining({ recommended_album_id: "true-blue", reason: "same_era" })
    ]);
  });

  it("uses same_genre_movement when genres match but the release is outside the same-era window", () => {
    const laterFunkAlbum = { id: "later-funk", title: "Later Funk", releaseDate: new Date("1995-01-01"), genre: "Funk / Soul" };

    const recommendations = deriveRecommendations(control, [laterFunkAlbum], new Set());

    expect(recommendations).toEqual([
      expect.objectContaining({ recommended_album_id: "later-funk", reason: "same_genre_movement" })
    ]);
  });

  it("excludes the subject album itself and albums with no matching reason", () => {
    const unrelated = { id: "unrelated", title: "Unrelated", releaseDate: new Date("2015-01-01"), genre: "Jazz" };

    const recommendations = deriveRecommendations(control, [control, unrelated], new Set());

    expect(recommendations).toEqual([]);
  });

  it("every derived recommendation includes a human-readable explanation", () => {
    const trueBlue = { id: "true-blue", title: "True Blue", releaseDate: new Date("1986-06-30"), genre: "Pop" };

    const [recommendation] = deriveRecommendations(control, [trueBlue], new Set());

    expect(recommendation.explanation.length).toBeGreaterThan(0);
  });
});
