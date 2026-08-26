"use client";

import { useEffect, useState } from "react";

interface LiveTraceEntry {
  id: string;
  label: string;
  args?: string;
  status: "pending" | "ok" | "error";
  durationMs?: number;
  response?: string;
  detail?: string;
}

const MAX_ENTRIES = 200;

export function AdminDebugPanel() {
  const [entries, setEntries] = useState<LiveTraceEntry[]>([]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return;
    }

    const source = new EventSource("/api/admin/trace-stream");

    source.onmessage = (event) => {
      const incoming = JSON.parse(event.data) as LiveTraceEntry;
      setEntries((current) => {
        const existingIndex = current.findIndex((entry) => entry.id === incoming.id);
        if (existingIndex === -1) {
          const next = [...current, incoming];
          return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
        }
        const next = [...current];
        next[existingIndex] = incoming;
        return next;
      });
    };

    return () => source.close();
  }, []);

  if (entries.length === 0) {
    return null;
  }

  const errorCount = entries.filter((entry) => entry.status === "error").length;

  return (
    <details className="mt-10 rounded-lg border border-white/90 bg-white/50 p-3 backdrop-blur-xl">
      <summary className="cursor-pointer font-mono text-[10px] tracking-[0.18em] text-[#6b6577]">
        DEBUG: CHAMADAS DO SERVIDOR ({entries.length}){errorCount > 0 ? ` · ${errorCount} ERRO(S)` : ""}
      </summary>
      <ul className="mt-3 flex max-h-[420px] flex-col gap-2 overflow-y-auto">
        {entries.map((entry) => (
          <li key={entry.id} className="font-mono text-[11px] leading-snug">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 flex-none rounded-full ${
                  entry.status === "error" ? "bg-[#d1145a]" : entry.status === "pending" ? "bg-[#a8a2b0] animate-pulse" : "bg-[#0d7a5c]"
                }`}
              />
              <span className="text-[#171420]">{entry.label}</span>
              <span className="text-[#a8a2b0]">
                {entry.status === "pending" ? "chamando..." : `${entry.durationMs}ms`}
              </span>
            </div>
            {entry.args && <p className="ml-3.5 break-all text-[#a8a2b0]">args: {entry.args}</p>}
            {entry.response && <p className="ml-3.5 break-all text-[#0d7a5c]">{entry.response}</p>}
            {entry.detail && <p className="ml-3.5 break-all text-[#d1145a]">{entry.detail}</p>}
          </li>
        ))}
      </ul>
    </details>
  );
}
