import type { NarrativeStatement } from "@/app/lib/ai/narrative";
import { SectionCard } from "@/components/SectionCard";

const UNCERTAIN_KINDS: NarrativeStatement["kind"][] = ["interpretation", "critical_opinion", "unconfirmed"];

export function NarrativeSection({
  title,
  statements
}: {
  title: string;
  statements: NarrativeStatement[];
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
    <SectionCard title={title}>
      <p className="font-sans text-[17px] font-light leading-relaxed text-[#443f4f]">
        {statements.map((statement, index) => (
          <span key={index}>
            <span
              className={UNCERTAIN_KINDS.includes(statement.kind) ? "text-[#6b6577]" : undefined}
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
        <p className="mt-4 font-mono text-[10px] tracking-[0.05em] text-[#a8a2b0]">
          Fontes: {sourceOrder.map((sourceId, index) => `[${index + 1}] ${sourceId}`).join("  ")}
        </p>
      )}
    </SectionCard>
  );
}
