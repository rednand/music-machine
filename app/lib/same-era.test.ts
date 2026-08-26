import { describe, expect, it } from "vitest";
import { findSameEraAlbums, isSameEra } from "./same-era";

const control = { id: "control", releaseDate: new Date("1986-02-04") };

describe("isSameEra", () => {
  it("returns true for releases within the default ±1 calendar year window", () => {
    expect(isSameEra(control.releaseDate, new Date("1987-06-01"))).toBe(true);
    expect(isSameEra(control.releaseDate, new Date("1985-03-01"))).toBe(true);
  });

  it("returns false for releases outside the window", () => {
    expect(isSameEra(control.releaseDate, new Date("1988-01-01"))).toBe(false);
    expect(isSameEra(control.releaseDate, new Date("1995-01-01"))).toBe(false);
  });

  it("respects a custom window in calendar years", () => {
    expect(isSameEra(control.releaseDate, new Date("1986-08-01"), 0)).toBe(true);
    expect(isSameEra(control.releaseDate, new Date("1987-01-01"), 0)).toBe(false);
  });
});

describe("findSameEraAlbums", () => {
  const trueBlue = { id: "true-blue", releaseDate: new Date("1986-06-30") };
  const thriller = { id: "thriller", releaseDate: new Date("1982-11-30") };

  it("returns albums within the same-era window, excluding the target itself", () => {
    const results = findSameEraAlbums(control, [control, trueBlue, thriller]);

    expect(results.map((a) => a.id)).toEqual(["true-blue"]);
  });

  it("returns an empty array when nothing else is in the same era", () => {
    expect(findSameEraAlbums(control, [thriller])).toEqual([]);
  });
});
