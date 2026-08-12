import type { TrackRow } from "@/app/lib/db/album";
import { formatDuration } from "@/app/lib/format-duration";

export function TrackList({ tracks, highlightedTrackId }: { tracks: TrackRow[]; highlightedTrackId?: string }) {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <div
      className="grid gap-0 rounded-xl border border-white/85 bg-white/42 px-7 py-3.5 backdrop-blur-xl"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", columnGap: 52 }}
    >
      {tracks.map((track) => {
        const isHighlighted = track.id === highlightedTrackId;
        return (
          <div
            key={track.id}
            data-highlighted={isHighlighted}
            className={`flex items-baseline gap-[18px] border-b border-[#171420]/[0.07] py-3.5 last:border-b-0 ${
              isHighlighted ? "rounded bg-[#ffd9e6]/50" : ""
            }`}
          >
            {track.track_number !== undefined && (
              <span className="w-[18px] font-mono text-[10px] text-[#0d7a5c]">
                {String(track.track_number).padStart(2, "0")}
              </span>
            )}
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
