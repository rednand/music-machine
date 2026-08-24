import { vi } from "vitest";

export type FakeRow = Record<string, unknown>;

export interface FakeSupabaseTables {
  [table: string]: FakeRow[];
}

function matchesIlike(value: unknown, pattern: string): boolean {
  if (typeof value !== "string") return false;
  const regex = new RegExp(`^${pattern.replace(/%/g, ".*")}$`, "i");
  return regex.test(value);
}

export function createFakeSupabase(tables: FakeSupabaseTables) {
  let idCounter = 0;

  function makeBuilder(tableName: string) {
    tables[tableName] ??= [];
    const filters: Array<(row: FakeRow) => boolean> = [];
    let pendingInsert: FakeRow | null = null;
    let pendingUpdate: FakeRow | null = null;
    let pendingDelete = false;
    let orderColumn: string | null = null;
    let orderAscending = true;
    let limitCount: number | null = null;

    function currentRows(): FakeRow[] {
      let rows = tables[tableName].filter((row) => filters.every((f) => f(row)));
      if (orderColumn) {
        rows = [...rows].sort((a, b) => {
          const av = a[orderColumn!] as string;
          const bv = b[orderColumn!] as string;
          return orderAscending ? (av > bv ? 1 : -1) : av > bv ? -1 : 1;
        });
      }
      if (limitCount !== null) {
        rows = rows.slice(0, limitCount);
      }
      return rows;
    }

    const builder = {
      select: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation((data: FakeRow | FakeRow[]) => {
        const rows = Array.isArray(data) ? data : [data];
        const inserted = rows.map((row) => {
          idCounter += 1;
          return { id: `${tableName}-${idCounter}`, ...row };
        });
        tables[tableName].push(...inserted);
        pendingInsert = inserted[inserted.length - 1] ?? null;
        return builder;
      }),
      update: vi.fn().mockImplementation((data: FakeRow) => {
        pendingUpdate = data;
        return builder;
      }),
      delete: vi.fn().mockImplementation(() => {
        pendingDelete = true;
        return builder;
      }),
      eq: vi.fn().mockImplementation((column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      }),
      ilike: vi.fn().mockImplementation((column: string, pattern: string) => {
        filters.push((row) => matchesIlike(row[column], pattern));
        return builder;
      }),
      gte: vi.fn().mockImplementation((column: string, value: unknown) => {
        filters.push((row) => (row[column] as string) >= (value as string));
        return builder;
      }),
      lte: vi.fn().mockImplementation((column: string, value: unknown) => {
        filters.push((row) => (row[column] as string) <= (value as string));
        return builder;
      }),
      order: vi.fn().mockImplementation((column: string, opts?: { ascending?: boolean }) => {
        orderColumn = column;
        orderAscending = opts?.ascending ?? true;
        return builder;
      }),
      limit: vi.fn().mockImplementation((count: number) => {
        limitCount = count;
        return builder;
      }),
      maybeSingle: vi.fn().mockImplementation(async () => {
        const rows = currentRows();
        return { data: rows[0] ?? null, error: null };
      }),
      single: vi.fn().mockImplementation(async () => {
        if (pendingInsert) {
          return { data: pendingInsert, error: null };
        }
        if (pendingUpdate) {
          const matched = currentRows();
          for (const row of matched) {
            Object.assign(row, pendingUpdate);
          }
          return { data: matched[0] ?? null, error: null };
        }
        const rows = currentRows();
        return { data: rows[0] ?? null, error: null };
      }),
      then: (resolve: (result: { data: FakeRow[]; error: null }) => void) => {
        if (pendingDelete) {
          const matched = currentRows();
          tables[tableName] = tables[tableName].filter((row) => !matched.includes(row));
          resolve({ data: matched, error: null });
          return;
        }
        if (pendingUpdate) {
          const matched = currentRows();
          for (const row of matched) {
            Object.assign(row, pendingUpdate);
          }
          resolve({ data: matched, error: null });
          return;
        }
        resolve({ data: currentRows(), error: null });
      }
    };

    return builder;
  }

  return {
    from: vi.fn().mockImplementation((tableName: string) => makeBuilder(tableName))
  };
}

export type FakeSupabaseClient = ReturnType<typeof createFakeSupabase>;
