import { render, cleanup, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { AlbumAmbientTint } from "./AlbumAmbientTint";

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = "";
  private _src = "";

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }

  get src() {
    return this._src;
  }
}

describe("AlbumAmbientTint", () => {
  const originalImage = global.Image;

  beforeEach(() => {
    // @ts-expect-error -- test double, narrower than the real Image constructor
    global.Image = FakeImage;
  });

  afterEach(() => {
    cleanup();
    global.Image = originalImage;
    document.documentElement.style.removeProperty("--album-tint");
    document.documentElement.style.removeProperty("--album-tint-alpha");
    vi.restoreAllMocks();
  });

  function mockCanvasPixels(pixels: number[]) {
    const fakeCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(pixels) })
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);
  }

  it("sets the CSS variable from the average pixel color once the image loads", async () => {
    mockCanvasPixels([100, 150, 200, 255, 100, 150, 200, 255]);

    render(<AlbumAmbientTint coverArtUrl="https://example.com/cover.jpg" />);

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--album-tint")).toBe("100, 150, 200");
    });
    expect(document.documentElement.style.getPropertyValue("--album-tint-alpha")).toBe("0.38");
  });

  it("does nothing when there is no cover art url", () => {
    render(<AlbumAmbientTint />);

    expect(document.documentElement.style.getPropertyValue("--album-tint")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--album-tint-alpha")).toBe("");
  });

  it("removes the CSS variables on unmount", async () => {
    mockCanvasPixels([10, 20, 30, 255]);

    const { unmount } = render(<AlbumAmbientTint coverArtUrl="https://example.com/cover.jpg" />);
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--album-tint")).toBe("10, 20, 30");
    });

    unmount();

    expect(document.documentElement.style.getPropertyValue("--album-tint")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--album-tint-alpha")).toBe("");
  });

  it("picks a saturated pixel instead of a flat average that would wash the color out to gray", async () => {
    // A vivid red pixel and a vivid cyan pixel average out to flat gray (125,125,125);
    // the fix should surface one of the actual saturated colors instead.
    mockCanvasPixels([220, 30, 30, 255, 30, 220, 220, 255]);

    render(<AlbumAmbientTint coverArtUrl="https://example.com/cover.jpg" />);

    await waitFor(() => {
      const tint = document.documentElement.style.getPropertyValue("--album-tint");
      expect(tint).not.toBe("125, 125, 125");
      expect(tint).toBe("220, 30, 30");
    });
  });

  it("falls back to the plain average for a genuinely monochrome/grayscale cover", async () => {
    mockCanvasPixels([50, 50, 50, 255, 200, 200, 200, 255]);

    render(<AlbumAmbientTint coverArtUrl="https://example.com/cover.jpg" />);

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--album-tint")).toBe("125, 125, 125");
    });
  });

  it("leaves the ambient background untouched when the canvas context is unavailable (e.g. CORS)", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(<AlbumAmbientTint coverArtUrl="https://example.com/cover.jpg" />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.documentElement.style.getPropertyValue("--album-tint")).toBe("");
  });
});
