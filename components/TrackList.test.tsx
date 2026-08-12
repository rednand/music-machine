import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrackList } from "./TrackList";

describe("TrackList", () => {
  it("renders each track's number, title, and duration, highlighting the one matching the given id", () => {
    render(
      <TrackList
        tracks={[
          { id: "track-1", album_id: "album-1", title: "Papa Don't Preach", track_number: 1, duration_seconds: 268 },
          { id: "track-2", album_id: "album-1", title: "Open Your Heart", track_number: 2, duration_seconds: 253 }
        ]}
        highlightedTrackId="track-2"
      />
    );

    expect(screen.getByText("Papa Don't Preach")).toBeInTheDocument();
    expect(screen.getByText("4:28")).toBeInTheDocument();
    const highlighted = screen.getByText("Open Your Heart").closest("div[data-highlighted]");
    expect(highlighted).toHaveAttribute("data-highlighted", "true");
  });

  it("renders nothing when there are no tracks", () => {
    const { container } = render(<TrackList tracks={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders normally without a highlighted id matching anything", () => {
    render(
      <TrackList
        tracks={[{ id: "track-1", album_id: "album-1", title: "Control", track_number: 1 }]}
        highlightedTrackId="unknown"
      />
    );

    expect(screen.getByText("Control").closest("div[data-highlighted]")).toHaveAttribute("data-highlighted", "false");
  });
});
