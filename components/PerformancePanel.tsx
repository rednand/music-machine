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
    <div className="flex gap-3 overflow-x-auto pb-1">
      {records.map((record) => (
        <div
          key={record.id}
          className="w-[128px] flex-none rounded-lg border border-white/90 bg-white/50 p-3 backdrop-blur-xl"
          style={{ boxShadow: "0 24px 44px -36px rgba(23,20,32,0.35)" }}
        >
          <div title={record.label} className="truncate font-mono text-[8.5px] tracking-[0.2em] text-[#a8a2b0]">
            {record.label}
          </div>
          <div
            title={record.value}
            className={`mt-1 truncate font-serif text-lg font-bold ${
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
