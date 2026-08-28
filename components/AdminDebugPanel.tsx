"use client";

import { useEffect, useState, type CSSProperties } from "react";

interface LiveTraceEntry {
  id: string;
  label: string;
  args?: string;
  status: "pending" | "ok" | "error";
  durationMs?: number;
  response?: string;
  detail?: string;
}

interface Origin {
  x: number;
  y: number;
}

const MAX_ENTRIES = 200;
const PANEL_WIDTH = 380;
const PANEL_MARGIN = 12;

export function AdminDebugPanel() {
  const [entries, setEntries] = useState<LiveTraceEntry[]>([]);
  const [origin, setOrigin] = useState<Origin | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("button, a, [role='button']")) {
        return;
      }
      const x = Math.min(Math.max(event.clientX, PANEL_MARGIN), window.innerWidth - PANEL_WIDTH - PANEL_MARGIN);
      const y = Math.min(event.clientY + 16, window.innerHeight - 80);
      setOrigin({ x, y });
      setEntries([]);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

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

  const style: CSSProperties = origin
    ? { position: "fixed", left: origin.x, top: origin.y, width: PANEL_WIDTH, zIndex: 50 }
    : { position: "fixed", right: PANEL_MARGIN, bottom: PANEL_MARGIN, width: PANEL_WIDTH, zIndex: 50 };

  return (
    <details style={style} className="rounded-lg border border-white/90 bg-white/95 p-3 shadow-xl backdrop-blur-xl">
      <summary className="cursor-pointer font-mono text-[10px] tracking-[0.18em] text-[#6b6577]">
        DEBUG: CHAMADAS DO SERVIDOR ({entries.length}){errorCount > 0 ? ` · ${errorCount} ERRO(S)` : ""}
      </summary>
      <ul className="mt-3 flex max-h-[420px] flex-col gap-2 overflow-y-auto">
        {[...entries].reverse().map((entry) => (
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
