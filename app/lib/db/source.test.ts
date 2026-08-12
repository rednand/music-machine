import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./test-helpers";
import { createSourceRepository, MissingAttributionError, licenseRequiresAttribution } from "./source";

describe("licenseRequiresAttribution", () => {
  it("returns false for no license", () => {
    expect(licenseRequiresAttribution(undefined)).toBe(false);
  });

  it("returns true for CC BY-SA style licenses used by encyclopedic sources", () => {
    expect(licenseRequiresAttribution("CC-BY-SA-4.0")).toBe(true);
  });
});

describe("SourceRepository", () => {
  it("creates a source when a CC license has attribution_text", async () => {
    const supabase = createFakeSupabase({});
    const repo = createSourceRepository(supabase as never);

    const created = await repo.create({
      type: "encyclopedic",
      title: "Control (album)",
      url: "https://en.wikipedia.org/wiki/Control_(album)",
      license_type: "CC-BY-SA-4.0",
      attribution_text: "Wikipedia contributors, CC BY-SA 4.0"
    });

    expect(created.id).toBeDefined();
  });

  it("throws MissingAttributionError when a CC license has no attribution_text", async () => {
    const supabase = createFakeSupabase({});
    const repo = createSourceRepository(supabase as never);

    await expect(
      repo.create({
        type: "encyclopedic",
        title: "Control (album)",
        url: "https://en.wikipedia.org/wiki/Control_(album)",
        license_type: "CC-BY-SA-4.0"
      })
    ).rejects.toThrow(MissingAttributionError);
  });

  it("allows a source with no license at all", async () => {
    const supabase = createFakeSupabase({});
    const repo = createSourceRepository(supabase as never);

    const created = await repo.create({
      type: "official_primary",
      title: "Press release",
      url: "https://example.com/press-release"
    });

    expect(created.id).toBeDefined();
  });
});
