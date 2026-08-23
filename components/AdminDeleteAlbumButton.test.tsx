import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDeleteAlbumButton } from "./AdminDeleteAlbumButton";
import * as adminAction from "@/app/actions/admin";

vi.mock("server-only", () => ({}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

describe("AdminDeleteAlbumButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("asks for confirmation before deleting", async () => {
    render(<AdminDeleteAlbumButton albumId="album-1" albumTitle="Control" />);

    expect(screen.queryByText(/essa ação não pode ser desfeita/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /excluir álbum/i }));

    expect(screen.getByText(/essa ação não pode ser desfeita/i)).toBeInTheDocument();
  });

  it("cancels without deleting", async () => {
    const deleteSpy = vi.spyOn(adminAction, "deleteAlbum");

    render(<AdminDeleteAlbumButton albumId="album-1" albumTitle="Control" />);
    await userEvent.click(screen.getByRole("button", { name: /excluir álbum/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByText(/essa ação não pode ser desfeita/i)).not.toBeInTheDocument();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("deletes the album and navigates home on confirm", async () => {
    vi.spyOn(adminAction, "deleteAlbum").mockResolvedValue({ state: "ready" });

    render(<AdminDeleteAlbumButton albumId="album-1" albumTitle="Control" />);
    await userEvent.click(screen.getByRole("button", { name: /excluir álbum/i }));
    await userEvent.click(screen.getByRole("button", { name: /sim, excluir/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("shows an error and stays on the page when deletion fails", async () => {
    vi.spyOn(adminAction, "deleteAlbum").mockResolvedValue({ state: "error", message: "Não foi possível excluir este álbum." });

    render(<AdminDeleteAlbumButton albumId="album-1" albumTitle="Control" />);
    await userEvent.click(screen.getByRole("button", { name: /excluir álbum/i }));
    await userEvent.click(screen.getByRole("button", { name: /sim, excluir/i }));

    await waitFor(() => expect(screen.getByText("Não foi possível excluir este álbum.")).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
