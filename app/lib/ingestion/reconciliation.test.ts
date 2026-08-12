import { describe, expect, it } from "vitest";
import { NoCandidatesError, reconcileField } from "./reconciliation";

describe("reconcileField", () => {
  it("prefers the higher-priority tier when candidates disagree", () => {
    const result = reconcileField([
      { value: "1986-02-03", tier: "encyclopedic", providerName: "encyclopedia" },
      { value: "1986-02-04", tier: "music_database", providerName: "catalog" }
    ]);

    expect(result).toEqual({ value: "1986-02-04", discrepancy: false, conflictingValues: undefined });
  });

  it("returns the shared value without discrepancy when same-tier sources agree", () => {
    const result = reconcileField([
      { value: "1986-02-04", tier: "music_database", providerName: "catalog" },
      { value: "1986-02-04", tier: "music_database", providerName: "discography" }
    ]);

    expect(result.value).toBe("1986-02-04");
    expect(result.discrepancy).toBe(false);
  });

  it("surfaces a discrepancy instead of silently picking a value when same-tier sources disagree", () => {
    const result = reconcileField([
      { value: "1986-02-04", tier: "music_database", providerName: "catalog" },
      { value: "1986-02-03", tier: "music_database", providerName: "discography" }
    ]);

    expect(result.discrepancy).toBe(true);
    expect(result.conflictingValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "1986-02-04", providerName: "catalog" }),
        expect.objectContaining({ value: "1986-02-03", providerName: "discography" })
      ])
    );
  });

  it("throws when there are no candidates", () => {
    expect(() => reconcileField([])).toThrow(NoCandidatesError);
  });

  it("follows the FR-016 tier order end to end", () => {
    const result = reconcileField([
      { value: "A", tier: "specialized_publication", providerName: "mag" },
      { value: "B", tier: "official_primary", providerName: "label-press-release" }
    ]);
    expect(result.value).toBe("B");
  });
});
