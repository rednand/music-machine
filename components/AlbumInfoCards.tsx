import type { CreditRow } from "@/app/lib/db/album";
import { formatLongDatePtBr } from "@/app/lib/format-date";

function isProductionRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized.includes("produc") || normalized.includes("produç");
}

function InfoCard({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
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
  credits
}: {
  releaseDate: string;
  label?: string;
  credits: CreditRow[];
}) {
  const producers = Array.from(new Set(credits.filter((credit) => isProductionRole(credit.role)).map((credit) => credit.person_name)));

  return (
    <div className="grid grid-cols-1 gap-[14px] md:grid-cols-3">
      <InfoCard label="LANÇAMENTO" value={formatLongDatePtBr(releaseDate)} />
      {label && <InfoCard label="GRAVADORA" value={label} />}
      {producers.length > 0 && <InfoCard label="PRODUÇÃO" value={producers.join(" · ")} span2 />}
    </div>
  );
}
