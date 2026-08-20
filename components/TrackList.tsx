import { Music2 } from "lucide-react";
import type { TrackRow } from "@/app/lib/db/album";
import { formatDuration } from "@/app/lib/format-duration";

const COLUMNS = 3;

export function TrackList({ tracks, highlightedTrackId }: { tracks: TrackRow[]; highlightedTrackId?: string }) {
  if (tracks.length === 0) {
    return null;
  }

  const rowCount = Math.ceil(tracks.length / COLUMNS);

  return (
    <div
      className="grid grid-cols-1 gap-0 rounded-xl border border-white/85 bg-white/55 px-7 py-3.5 sm:grid-cols-2 lg:grid-cols-3"
      style={{ columnGap: 40 }}
    >
      {tracks.map((track, index) => {
        const isHighlighted = track.id === highlightedTrackId;
        const isLastRow = Math.floor(index / COLUMNS) === rowCount - 1;
        return (
          <div
            key={track.id}
            data-highlighted={isHighlighted}
            className={`flex items-baseline gap-[18px] py-3.5 ${isLastRow ? "" : "border-b border-[#171420]/[0.07]"} ${
              isHighlighted ? "rounded bg-[#ffd9e6]/50" : ""
            }`}
          >
            <Music2 aria-hidden="true" className="h-[14px] w-[14px] flex-none text-[#0d7a5c]" />
            <span className="flex-1 font-serif text-xl text-[#120f18]">{track.title}</span>
            {track.duration_seconds !== undefined && (
              <span className="font-mono text-[11px] text-[#a8a2b0]">{formatDuration(track.duration_seconds)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
