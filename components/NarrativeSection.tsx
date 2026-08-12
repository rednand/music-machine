import type { NarrativeStatement } from "@/app/lib/ai/narrative";

const UNCERTAIN_KINDS: NarrativeStatement["kind"][] = ["interpretation", "critical_opinion", "unconfirmed"];

export function NarrativeSection({
  title,
  statements,
  number
}: {
  title: string;
  statements: NarrativeStatement[];
  number?: string;
}) {
  if (statements.length === 0) {
    return null;
  }

  const sourceOrder: string[] = [];
  for (const statement of statements) {
    for (const sourceId of statement.sourceIds) {
      if (!sourceOrder.includes(sourceId)) {
        sourceOrder.push(sourceId);
      }
    }
  }

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-xl border border-white/90 bg-white/50 p-8 backdrop-blur-xl"
      style={{ boxShadow: "0 34px 60px -44px rgba(23,20,32,0.35)" }}
    >
      {number && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-2 select-none font-serif text-[110px] font-bold leading-none text-[#171420]/[0.06]"
        >
          {number}
        </div>
      )}
      <h2 className="relative z-10 mb-5 font-serif text-2xl font-bold text-[#120f18]">{title}</h2>
      <p className="relative z-10 font-sans text-[17px] font-light leading-relaxed text-[#443f4f]">
        {statements.map((statement, index) => (
          <span key={index}>
            <span
              className={
                index === 0
                  ? "font-serif text-xl italic text-[#120f18]"
                  : UNCERTAIN_KINDS.includes(statement.kind)
                    ? "italic text-[#6b6577]"
                    : undefined
              }
            >
              {statement.text}
            </span>
            {statement.sourceIds.map((sourceId) => (
              <sup key={sourceId} className="ml-0.5 text-[10px] text-[#0d7a5c]">
                [{sourceOrder.indexOf(sourceId) + 1}]
              </sup>
            ))}
            {" "}
          </span>
        ))}
      </p>
      {sourceOrder.length > 0 && (
        <p className="relative z-10 mt-4 font-mono text-[10px] tracking-[0.05em] text-[#a8a2b0]">
          Fontes: {sourceOrder.map((sourceId, index) => `[${index + 1}] ${sourceId}`).join("  ")}
        </p>
      )}
    </section>
  );
}
