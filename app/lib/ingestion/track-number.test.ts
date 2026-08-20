import { describe, expect, it } from "vitest";
import { parseTrackNumber } from "./track-number";

describe("parseTrackNumber", () => {
  it("parses a numeric position string into an integer", () => {
    expect(parseTrackNumber("3")).toBe(3);
  });

  it("returns undefined for an empty position, instead of treating it as track 0", () => {
    expect(parseTrackNumber("")).toBeUndefined();
  });

  it("returns undefined for a non-numeric position such as a vinyl side heading", () => {
    expect(parseTrackNumber("A")).toBeUndefined();
  });

  it("returns undefined for a decimal position", () => {
    expect(parseTrackNumber("1.5")).toBeUndefined();
  });
});
