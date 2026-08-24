import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { publishAdminTraceEvent } from "./admin-trace-bus";

export interface AdminTraceEntry {
  label: string;
  args?: string;
  status: "ok" | "error";
  durationMs: number;
  response?: string;
  detail?: string;
}

interface TraceContext {
  entries: AdminTraceEntry[];
}

const storage = new AsyncLocalStorage<TraceContext>();
const MAX_PREVIEW_LENGTH = 400;

function preview(value: unknown): string {
  try {
    const serialized = JSON.stringify(value, (_key, val) => (val instanceof Set ? Array.from(val) : val));
    if (serialized === undefined) {
      return String(value);
    }
    return serialized.length > MAX_PREVIEW_LENGTH ? `${serialized.slice(0, MAX_PREVIEW_LENGTH)}…` : serialized;
  } catch {
    return "[não serializável]";
  }
}

export async function runWithAdminTrace<T>(
  enabled: boolean,
  fn: () => Promise<T>
): Promise<{ result: T; trace: AdminTraceEntry[] }> {
  if (!enabled) {
    return { result: await fn(), trace: [] };
  }

  const context: TraceContext = { entries: [] };
  const result = await storage.run(context, fn);
  return { result, trace: context.entries };
}

function record(entry: AdminTraceEntry): void {
  storage.getStore()?.entries.push(entry);
}

export function traceStep<Args extends unknown[], R>(
  label: string,
  fn: (...args: Args) => Promise<R>
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    if (!storage.getStore()) {
      return fn(...args);
    }

    const id = randomUUID();
    const argsPreview = preview(args);
    const start = Date.now();
    publishAdminTraceEvent({ id, label, args: argsPreview, status: "pending" });

    try {
      const result = await fn(...args);
      const entry: AdminTraceEntry = {
        label,
        args: argsPreview,
        status: "ok",
        durationMs: Date.now() - start,
        response: preview(result)
      };
      record(entry);
      publishAdminTraceEvent({ id, ...entry });
      return result;
    } catch (error) {
      const entry: AdminTraceEntry = {
        label,
        args: argsPreview,
        status: "error",
        durationMs: Date.now() - start,
        detail: error instanceof Error ? error.message : String(error)
      };
      record(entry);
      publishAdminTraceEvent({ id, ...entry });
      throw error;
    }
  };
}

export function traceDeps<T extends object>(deps: T, keys: readonly (keyof T)[]): T {
  const traced: Record<string, unknown> = { ...(deps as Record<string, unknown>) };
  for (const key of keys) {
    const value = deps[key];
    if (typeof value === "function") {
      traced[key as string] = traceStep(key as string, value as (...args: unknown[]) => Promise<unknown>);
    }
  }
  return traced as T;
}
