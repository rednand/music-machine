import type { NarrativeStatement } from "@/app/lib/ai/narrative";
import { SectionCard } from "@/components/SectionCard";

export function CategoryCardGrid({
  title,
  statements,
  labels
}: {
  title: string;
  statements: NarrativeStatement[];
  labels: string[];
}) {
  if (statements.length === 0) {
    return null;
  }

  const cards = labels.slice(0, statements.length).map((label, index) => ({
    label,
    statement: statements[index]
  }));

  return (
    <SectionCard title={title}>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ label, statement }) => (
          <div
            key={label}
            className="rounded-xl border border-white/90 bg-white/50 p-5 backdrop-blur-xl"
            style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
          >
            <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#0d7a5c]">{label.toUpperCase()}</div>
            <p className="mt-2 font-sans text-[15px] font-light leading-relaxed text-[#443f4f]">{statement.text}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
