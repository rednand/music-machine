import type { CuriosityRow } from "@/app/lib/db/curiosity";

export interface CuriositiesListProps {
  curiosities: CuriosityRow[];
}

const STATUS_LABEL: Record<CuriosityRow["status"], string> = {
  confirmed: "Confirmado",
  unconfirmed: "Não confirmado",
  disputed: "Contestado"
};

export function CuriositiesList({ curiosities }: CuriositiesListProps) {
  if (curiosities.length === 0) {
    return (
      <p className="font-sans text-sm font-light text-[#6b6577]">Nenhuma curiosidade registrada para este álbum.</p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {curiosities.map((curiosity) => (
        <div
          key={curiosity.id}
          className="rounded-xl border border-white/90 bg-white/50 p-5 backdrop-blur-xl"
          style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-[#d1145a]">
              ★
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.22em] text-[#a8a2b0]">
              {STATUS_LABEL[curiosity.status]}
            </span>
          </div>
          <p className="mt-2 font-sans text-[15px] font-light leading-relaxed text-[#443f4f]">{curiosity.summary}</p>
        </div>
      ))}
    </div>
  );
}
