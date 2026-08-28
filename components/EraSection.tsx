import type { EraSection as EraSectionData } from "@/app/lib/ingestion/album-context";
import { SectionCard } from "@/components/SectionCard";
import { formatLongDatePtBr } from "@/app/lib/format-date";

type TimelineEntry =
  | { kind: "event"; date: string; title: string }
  | { kind: "album"; date: string; title: string; artistName: string; coverArtUrl?: string };

export function EraSection({
  era,
  artistName,
  albumTitle,
  releaseDate,
  coverArtUrl
}: {
  era: EraSectionData;
  artistName: string;
  albumTitle: string;
  releaseDate: string;
  coverArtUrl?: string;
}) {
  if (era.news.length === 0 && era.historicalEvents.length === 0) {
    return null;
  }

  const news = [...era.news].sort((a, b) => a.date.localeCompare(b.date));

  const albumEntry: TimelineEntry = { kind: "album", date: releaseDate, title: albumTitle, artistName, coverArtUrl };
  const timeline: TimelineEntry[] =
    era.historicalEvents.length === 0
      ? []
      : [
          ...era.historicalEvents.map((event): TimelineEntry => ({ kind: "event", date: event.date, title: event.title })),
          albumEntry
        ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <SectionCard id="era" title={`Era ${era.year}`}>
      <div className="flex max-h-[480px] flex-col overflow-y-auto pr-2">
        {news.length > 0 && (
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#6b6577]">
              NOTÍCIAS SOBRE {artistName.toUpperCase()}
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {news.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-wrap items-baseline gap-x-3 rounded-lg border border-white/90 bg-white/50 px-4 py-2.5 backdrop-blur-xl transition-colors hover:border-[#d1145a]/40 hover:bg-white/70"
                  >
                    {item.date && (
                      <span className="font-mono text-[10px] tracking-[0.18em] text-[#a8a2b0]">
                        {formatLongDatePtBr(item.date).toUpperCase()}
                      </span>
                    )}
                    <span className="font-sans text-sm text-[#443f4f]">{item.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {timeline.length > 0 && (
          <div className={news.length > 0 ? "mt-8" : undefined}>
            <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#6b6577]">
              O QUE MAIS ACONTECEU EM {era.year}
            </p>
            <ul className="mt-3 flex flex-col gap-4 rounded-lg border border-white/90 bg-white/50 p-4 backdrop-blur-xl">
              {timeline.map((entry, index) =>
                entry.kind === "album" ? (
                  <li key={`album-${entry.date}-${index}`}>
                    <span className="block font-mono text-[10px] tracking-[0.18em] text-[#a8a2b0]">
                      {formatLongDatePtBr(entry.date).toUpperCase()}
                    </span>
                    <div className="mt-1 flex items-center gap-4 rounded-lg border border-[#d1145a]/25 bg-[#ffd9e6]/25 p-3">
                      <div
                        className="h-14 w-14 flex-none overflow-hidden rounded-md"
                        style={{ background: "repeating-linear-gradient(135deg, #e4dff2 0 9px, #f2eff9 9px 18px)" }}
                      >
                        {entry.coverArtUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.coverArtUrl} alt={entry.title} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="block font-mono text-[10px] tracking-[0.2em] text-[#d1145a]">
                          {entry.artistName.toUpperCase()}
                        </span>
                        <span className="mt-0.5 block break-words font-serif text-lg font-bold text-[#120f18]">
                          {entry.title}
                        </span>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={`event-${entry.title}-${index}`}>
                    <span className="block font-mono text-[10px] tracking-[0.18em] text-[#a8a2b0]">
                      {formatLongDatePtBr(entry.date).toUpperCase()}
                    </span>
                    <span className="mt-1 block font-sans text-sm font-light leading-relaxed text-[#443f4f]">
                      {entry.title}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
