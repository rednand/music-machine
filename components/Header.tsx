import type { AlbumContextHeader } from "@/app/lib/ingestion/album-context";
import { buildStreamingLinks } from "@/app/lib/streaming-links";

export function Header({ header }: { header: AlbumContextHeader }) {
  const year = header.releaseDate.slice(0, 4);
  const streamingLinks = buildStreamingLinks(header.title, header.artist);

  return (
    <div
      className="relative grid items-center gap-[clamp(24px,3.4vw,44px)] overflow-hidden rounded-xl border border-white/90 bg-white/50 p-6 backdrop-blur-2xl md:grid-cols-[minmax(190px,320px)_minmax(0,1fr)]"
      style={{ boxShadow: "0 50px 90px -52px rgba(23,20,32,0.5)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-18px] right-[26px] z-0 font-serif text-[clamp(84px,13vw,190px)] font-bold leading-none tracking-[-0.04em] text-[#171420]/[0.06]"
      >
        {year}
      </div>

      <div
        className="aspect-square overflow-hidden rounded-lg"
        style={{ background: "repeating-linear-gradient(135deg, #dde5f7 0 11px, #eff2fb 11px 22px)" }}
      >
        {header.coverArtUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={header.coverArtUrl} alt={header.title} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="relative z-10">
        <div className="font-mono text-[10px] tracking-[0.28em] text-[#0d7a5c]">{header.artist.toUpperCase()}</div>
        <h1 className="mb-3 mt-4 font-serif text-[clamp(42px,5.8vw,78px)] font-bold leading-[0.98] tracking-[-0.035em] text-[#120f18]">
          {header.title}
        </h1>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {streamingLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] tracking-[0.2em] text-[#6b6577] transition-colors hover:text-[#d1145a]"
            >
              {link.label.toUpperCase()} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
