import type { NarrativeStatement } from "@/app/lib/ai/narrative";
import { SectionCard } from "@/components/SectionCard";

export function ReceptionSplit({
  number,
  title,
  statements
}: {
  number?: string;
  title: string;
  statements: NarrativeStatement[];
}) {
  if (statements.length === 0) {
    return null;
  }

  const [atLaunch, today] = statements;

  return (
    <SectionCard number={number} title={title}>
      <div className={`grid gap-4 ${today ? "md:grid-cols-2" : ""}`}>
        <div
          className="rounded-xl border border-white/90 bg-white/50 p-5 backdrop-blur-xl"
          style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
        >
          <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#a8a2b0]">NO LANÇAMENTO</div>
          <p className="mt-2 font-sans text-[15px] font-light leading-relaxed text-[#443f4f]">{atLaunch.text}</p>
        </div>
        {today && (
          <div
            className="rounded-xl border border-[#d1145a]/20 bg-[#ffd9e6]/30 p-5 backdrop-blur-xl"
            style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
          >
            <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#d1145a]">HOJE</div>
            <p className="mt-2 font-sans text-[15px] font-light leading-relaxed text-[#443f4f]">{today.text}</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
