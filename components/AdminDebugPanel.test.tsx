import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminDebugPanel } from "./AdminDebugPanel";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  close() {
    this.closed = true;
  }
}

describe("AdminDebugPanel", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    // @ts-expect-error test double for the browser-only EventSource API
    global.EventSource = FakeEventSource;
  });

  afterEach(() => {
    // @ts-expect-error cleanup the test double
    delete global.EventSource;
  });

  it("renders nothing before any call has been observed", () => {
    render(<AdminDebugPanel />);

    expect(screen.queryByText(/DEBUG/)).not.toBeInTheDocument();
  });

  it("shows a pending call and then updates it in place once it resolves", async () => {
    render(<AdminDebugPanel />);
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit({ id: "1", label: "findAlbum", status: "pending" });
    });

    expect(screen.getByText("findAlbum")).toBeInTheDocument();
    expect(screen.getByText("chamando...")).toBeInTheDocument();

    act(() => {
      source.emit({ id: "1", label: "findAlbum", status: "ok", durationMs: 42, response: '{"id":"album-1"}' });
    });

    expect(screen.getByText("42ms")).toBeInTheDocument();
    expect(screen.getByText('{"id":"album-1"}')).toBeInTheDocument();
  });

  it("surfaces the error message and counts it in the summary", () => {
    render(<AdminDebugPanel />);
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit({
        id: "1",
        label: "persistCredits",
        status: "error",
        durationMs: 10,
        detail: "Failed to create source: 23502"
      });
    });

    expect(screen.getByText(/1 ERRO/)).toBeInTheDocument();
    expect(screen.getByText("Failed to create source: 23502")).toBeInTheDocument();
  });

  it("keeps the most recent call at the top of the list", () => {
    render(<AdminDebugPanel />);
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit({ id: "1", label: "findAlbum", status: "ok", durationMs: 12 });
    });
    act(() => {
      source.emit({ id: "2", label: "findArtistById", status: "pending" });
    });

    const labels = screen.getAllByText(/^(findAlbum|findArtistById)$/).map((node) => node.textContent);
    expect(labels).toEqual(["findArtistById", "findAlbum"]);
  });

  it("clears previous calls when a new button is clicked", () => {
    render(
      <div>
        <button type="button">Outro botão</button>
        <AdminDebugPanel />
      </div>
    );
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit({ id: "1", label: "findAlbum", status: "ok", durationMs: 12 });
    });
    expect(screen.getByText("findAlbum")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "Outro botão" }).click();
    });

    expect(screen.queryByText("findAlbum")).not.toBeInTheDocument();
    expect(screen.queryByText(/DEBUG/)).not.toBeInTheDocument();

    act(() => {
      source.emit({ id: "2", label: "findArtistById", status: "ok", durationMs: 8 });
    });

    expect(screen.getByText("findArtistById")).toBeInTheDocument();
    expect(screen.queryByText("findAlbum")).not.toBeInTheDocument();
  });

  it("closes the event source on unmount", () => {
    const { unmount } = render(<AdminDebugPanel />);
    const source = FakeEventSource.instances[0];

    unmount();

    expect(source.closed).toBe(true);
  });
});
