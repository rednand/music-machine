import { describe, expect, it } from "vitest";
import { formatLongDatePtBr } from "./format-date";

describe("formatLongDatePtBr", () => {
  it("formats an ISO date as a long pt-BR date, independent of timezone", () => {
    expect(formatLongDatePtBr("1986-06-30")).toBe("30 de junho de 1986");
  });

  it("formats a January date correctly", () => {
    expect(formatLongDatePtBr("1982-01-01")).toBe("1 de janeiro de 1982");
  });

  it("returns the original string when it doesn't match the expected format", () => {
    expect(formatLongDatePtBr("not-a-date")).toBe("not-a-date");
  });
});
