import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import YearPage from "./page";
import * as yearContextAction from "../../../actions/year-context";

describe("YearPage", () => {
  it("renders the year heading, historical events, and matching albums", async () => {
    vi.spyOn(yearContextAction, "getYearContext").mockResolvedValue({
      state: "ready",
      year: "1986",
      albums: [
        { albumId: "album-1", title: "Control", artistName: "Janet Jackson", releaseYear: "1986", hook: null }
      ],
      historicalEvents: [{ title: "Desastre do Challenger", date: "1986-01-28" }]
    });

    const element = await YearPage({ params: Promise.resolve({ year: "1986" }) });
    render(element);

    expect(screen.getByRole("heading", { name: "1986" })).toBeInTheDocument();
    expect(screen.getByText("Desastre do Challenger")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Control" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /control/i })).toHaveAttribute("href", "/albums/album-1");
  });

  it("shows an empty-collection message when no album from that year is on record, without hiding events", async () => {
    vi.spyOn(yearContextAction, "getYearContext").mockResolvedValue({
      state: "ready",
      year: "1954",
      albums: [],
      historicalEvents: [{ title: "Copa do Mundo de 1954", date: "1954-07-04" }]
    });

    const element = await YearPage({ params: Promise.resolve({ year: "1954" }) });
    render(element);

    expect(screen.getByText(/nenhum álbum de 1954/i)).toBeInTheDocument();
    expect(screen.getByText("Copa do Mundo de 1954")).toBeInTheDocument();
  });

  it("renders an invalid-year message instead of crashing on a malformed year param", async () => {
    vi.spyOn(yearContextAction, "getYearContext").mockResolvedValue({ state: "invalid" });

    const element = await YearPage({ params: Promise.resolve({ year: "abcd" }) });
    render(element);

    expect(screen.getByText(/ano inválido/i)).toBeInTheDocument();
  });
});
