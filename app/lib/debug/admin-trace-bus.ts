import { EventEmitter } from "node:events";

export interface AdminTraceEvent {
  id: string;
  label: string;
  args?: string;
  status: "pending" | "ok" | "error";
  durationMs?: number;
  response?: string;
  detail?: string;
}

const globalForBus = globalThis as unknown as { __adminTraceBus?: EventEmitter };

function getBus(): EventEmitter {
  if (!globalForBus.__adminTraceBus) {
    globalForBus.__adminTraceBus = new EventEmitter();
    globalForBus.__adminTraceBus.setMaxListeners(50);
  }
  return globalForBus.__adminTraceBus;
}

export function publishAdminTraceEvent(event: AdminTraceEvent): void {
  getBus().emit("entry", event);
}

export function subscribeToAdminTrace(listener: (event: AdminTraceEvent) => void): () => void {
  const bus = getBus();
  bus.on("entry", listener);
  return () => bus.off("entry", listener);
}
