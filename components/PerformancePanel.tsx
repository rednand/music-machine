import type { PerformanceRecordRow } from "@/app/lib/db/performance-record";

export interface PerformancePanelProps {
  records: PerformanceRecordRow[] | null;
}

export function PerformancePanel({ records }: PerformancePanelProps) {
  if (!records || records.length === 0) {
    return (
      <p className="font-sans text-sm font-light text-[#6b6577]">
        Dados de desempenho não disponíveis para este lançamento.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {records.map((record) => (
        <div
          key={record.id}
          className="rounded-xl border border-white/90 bg-white/50 p-5 backdrop-blur-xl"
          style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
        >
          <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#a8a2b0]">{record.label}</div>
          <div
            className={`mt-2 font-serif text-2xl font-bold ${
              record.kind === "certification" ? "text-[#d1145a]" : "text-[#120f18]"
            }`}
          >
            {record.value}
          </div>
        </div>
      ))}
    </div>
  );
}
