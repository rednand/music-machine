import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/sorteio", useRouter: () => ({ push: vi.fn() }) }));

import SorteioPage from "./page";
import * as lotteryAction from "../../actions/lottery";

describe("SorteioPage", () => {
  it("renders the lottery screen when there are placements to draw from", async () => {
    vi.spyOn(lotteryAction, "getLotteryPool").mockResolvedValue([
      {
        key: "beyonce|lemonade",
        artistName: "Beyoncé",
        albumTitle: "Lemonade",
        placements: [{ listName: "Rolling Stone 500", position: 32 }],
        albumId: "album-1",
        genre: "R&B",
        releaseYear: "2016"
      }
    ]);

    const element = await SorteioPage();
    render(element);

    expect(screen.getByRole("heading", { name: "Sorteio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sortear/i })).toBeInTheDocument();
  });

  it("shows a guiding message instead of the draw button when there are no placements yet", async () => {
    vi.spyOn(lotteryAction, "getLotteryPool").mockResolvedValue([]);

    const element = await SorteioPage();
    render(element);

    expect(screen.getByText(/nenhuma lista carregada ainda/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sortear/i })).not.toBeInTheDocument();
  });
});
