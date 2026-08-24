import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import YearPage from "./page";
import * as yearContextAction from "../../../actions/year-context";

describe("YearPage", () => {
  it("renders the year heading, historical events, and matching albums", async () => {
    const album = {
      albumId: "album-1",
      title: "Control",
      artistName: "Janet Jackson",
      releaseYear: "1986",
      releaseDate: "1986-02-04",
      hook: null
    };
    vi.spyOn(yearContextAction, "getYearContext").mockResolvedValue({
      state: "ready",
      year: "1986",
      albums: [album],
      historicalEvents: [{ title: "Desastre do Challenger", date: "1986-01-28" }],
      timeline: [
        { kind: "event", date: "1986-01-28", title: "Desastre do Challenger" },
        { kind: "album", date: "1986-02-04", album }
      ]
    });

    const element = await YearPage({ params: Promise.resolve({ year: "1986" }) });
    render(element);

    expect(screen.getByRole("heading", { name: "1986" })).toBeInTheDocument();
    expect(screen.getByText("Desastre do Challenger")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Control" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /control/i })).toHaveAttribute("href", "/albums/album-1");
  });

  it("renders events on the timeline even when no album from that year is on record", async () => {
    vi.spyOn(yearContextAction, "getYearContext").mockResolvedValue({
      state: "ready",
      year: "1954",
      albums: [],
      historicalEvents: [{ title: "Copa do Mundo de 1954", date: "1954-07-04" }],
      timeline: [{ kind: "event", date: "1954-07-04", title: "Copa do Mundo de 1954" }]
    });

    const element = await YearPage({ params: Promise.resolve({ year: "1954" }) });
    render(element);

    expect(screen.getByText("Copa do Mundo de 1954")).toBeInTheDocument();
  });

  it("shows an empty timeline message when nothing is on record for that year", async () => {
    vi.spyOn(yearContextAction, "getYearContext").mockResolvedValue({
      state: "ready",
      year: "1954",
      albums: [],
      historicalEvents: [],
      timeline: []
    });

    const element = await YearPage({ params: Promise.resolve({ year: "1954" }) });
    render(element);

    expect(screen.getByText(/nada registrado para 1954/i)).toBeInTheDocument();
  });

  it("renders an invalid-year message instead of crashing on a malformed year param", async () => {
    vi.spyOn(yearContextAction, "getYearContext").mockResolvedValue({ state: "invalid" });

    const element = await YearPage({ params: Promise.resolve({ year: "abcd" }) });
    render(element);

    expect(screen.getByText(/ano inválido/i)).toBeInTheDocument();
  });
});
