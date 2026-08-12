export const DEFAULT_PROVIDER_REVALIDATE_SECONDS = 60 * 60 * 24;

export interface CachedFetchInit extends RequestInit {
  revalidateSeconds?: number;
}

export async function cachedFetch(
  url: string,
  init: CachedFetchInit | undefined,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const { revalidateSeconds = DEFAULT_PROVIDER_REVALIDATE_SECONDS, ...rest } = init ?? {};

  return fetchImpl(url, {
    ...rest,
    next: { revalidate: revalidateSeconds }
  } as RequestInit);
}
