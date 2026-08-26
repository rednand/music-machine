export interface SupabaseQueryResult<T> {
  data: T | null;
  error: unknown;
}

export interface SupabaseQueryBuilder<T = Record<string, unknown>> {
  select(columns?: string): SupabaseQueryBuilder<T>;
  insert(data: object): SupabaseQueryBuilder<T>;
  update(data: object): SupabaseQueryBuilder<T>;
  delete(): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  ilike(column: string, pattern: string): SupabaseQueryBuilder<T>;
  gte(column: string, value: unknown): SupabaseQueryBuilder<T>;
  lte(column: string, value: unknown): SupabaseQueryBuilder<T>;
  in(column: string, values: unknown[]): SupabaseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  limit(count: number): SupabaseQueryBuilder<T>;
  maybeSingle(): Promise<SupabaseQueryResult<T>>;
  single(): Promise<SupabaseQueryResult<T>>;
  then(resolve: (result: SupabaseQueryResult<T[]>) => void): void;
}

export interface SupabaseLike {
  from<T = Record<string, unknown>>(table: string): SupabaseQueryBuilder<T>;
}

export function toSupabaseLike(client: unknown): SupabaseLike {
  return client as SupabaseLike;
}
