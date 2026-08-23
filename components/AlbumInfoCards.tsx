import type { ComponentType } from "react";
import type { CreditRow } from "@/app/lib/db/album";
import { formatLongDatePtBr } from "@/app/lib/format-date";
import { buildStreamingLinks } from "@/app/lib/streaming-links";
import { AppleMusicIcon, DeezerIcon, SpotifyIcon, YoutubeMusicIcon } from "@/components/icons/StreamingIcons";

const STREAMING_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Deezer: DeezerIcon,
  Spotify: SpotifyIcon,
  "YouTube Music": YoutubeMusicIcon,
  "Apple Music": AppleMusicIcon
};

function isProductionRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized.includes("produc") || normalized.includes("produç");
}

function InfoCard({ label, value, span2 }: { label: string; value: React.ReactNode; span2?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-white/90 bg-white/55 p-5 px-6 backdrop-blur-xl ${span2 ? "md:col-span-2" : ""}`}
    >
      <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#a8a2b0]">{label}</div>
      <div className="mt-[10px] font-serif text-xl text-[#171420]">{value}</div>
    </div>
  );
}

export function AlbumInfoCards({
  releaseDate,
  label,
  credits,
  title,
  artistName
}: {
  releaseDate: string;
  label?: string;
  credits: CreditRow[];
  title: string;
  artistName: string;
}) {
  const producers = Array.from(new Set(credits.filter((credit) => isProductionRole(credit.role)).map((credit) => credit.person_name)));
  const streamingLinks = buildStreamingLinks(title, artistName);

  return (
    <div className="grid grid-cols-1 gap-[14px] md:grid-cols-3">
      <InfoCard label="LANÇAMENTO" value={formatLongDatePtBr(releaseDate)} />
      {label && <InfoCard label="GRAVADORA" value={label} />}
      <InfoCard
        label="OUVIR"
        value={
          <div className="flex gap-[10px]">
            {streamingLinks.map((link) => {
              const Icon = STREAMING_ICONS[link.label];
              return (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.label}
                  aria-label={`Ouvir no ${link.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/70 text-[#443f4f] transition-colors hover:border-[#d1145a]/50 hover:text-[#d1145a]"
                >
                  {Icon && <Icon className="h-[18px] w-[18px]" />}
                </a>
              );
            })}
          </div>
        }
      />
      {producers.length > 0 && <InfoCard label="PRODUÇÃO" value={producers.join(" · ")} span2 />}
    </div>
  );
}
