import { describe, expect, it } from "vitest";
import { formatDuration } from "./format-duration";

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(268)).toBe("4:28");
  });

  it("pads seconds under 10 with a leading zero", () => {
    expect(formatDuration(242)).toBe("4:02");
  });

  it("returns an empty string when duration is undefined", () => {
    expect(formatDuration(undefined)).toBe("");
  });
});
