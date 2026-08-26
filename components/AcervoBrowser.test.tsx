import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AcervoBrowser } from "./AcervoBrowser";

const entries = [
  { albumId: "album-1", title: "True Blue", artistName: "Madonna", releaseYear: "1986", genre: "Pop", hook: null },
  { albumId: "album-2", title: "Nevermind", artistName: "Nirvana", releaseYear: "1991", genre: "Rock", hook: null },
  { albumId: "album-3", title: "What's Going On", artistName: "Marvin Gaye", releaseYear: "1971", genre: "Soul", hook: null }
];

describe("AcervoBrowser", () => {
  it("renders every entry by default, in the given order", () => {
    render(<AcervoBrowser entries={entries} />);

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings).toEqual(["True Blue", "Nevermind", "What's Going On"]);
    expect(screen.getByText("3 ÁLBUNS")).toBeInTheDocument();
  });

  it("filters by title or artist as the user types", async () => {
    const user = userEvent.setup();
    render(<AcervoBrowser entries={entries} />);

    await user.type(screen.getByLabelText(/buscar/i), "gaye");

    expect(screen.getByRole("heading", { name: "What's Going On" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "True Blue" })).not.toBeInTheDocument();
    expect(screen.getByText("1 ÁLBUM")).toBeInTheDocument();
  });

  it("filters by the selected genre", async () => {
    const user = userEvent.setup();
    render(<AcervoBrowser entries={entries} />);

    await user.selectOptions(screen.getByLabelText(/gênero/i), "Rock");

    expect(screen.getByRole("heading", { name: "Nevermind" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "True Blue" })).not.toBeInTheDocument();
  });

  it("sorts alphabetically by title when that sort mode is chosen", async () => {
    const user = userEvent.setup();
    render(<AcervoBrowser entries={entries} />);

    await user.selectOptions(screen.getByLabelText(/ordenar/i), "title-asc");

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings).toEqual(["Nevermind", "True Blue", "What's Going On"]);
  });

  it("shows an empty-state message when no album matches the filters", async () => {
    const user = userEvent.setup();
    render(<AcervoBrowser entries={entries} />);

    await user.type(screen.getByLabelText(/buscar/i), "não existe nenhum álbum assim");

    expect(screen.getByText(/nenhum álbum encontrado/i)).toBeInTheDocument();
  });
});
