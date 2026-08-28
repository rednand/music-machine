"use client";

import { useEffect, useState } from "react";
import { getAlbumNarrative } from "@/app/actions/album-context";
import type { NarrativeResult } from "@/app/actions/album-context";

const POLL_INTERVAL_MS = 3007;

function needsMorePolling(result: NarrativeResult): boolean {
  if (result.state === "not_started" || result.state === "in_progress") {
    return true;
  }
  return result.state === "ready" && result.body.pendingFacets.length > 0;
}

export function useNarrativeResult(albumId: string, initial: NarrativeResult): NarrativeResult {
  const [result, setResult] = useState<NarrativeResult>(initial);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const next = await getAlbumNarrative(albumId);
        if (cancelled) {
          return;
        }
        setResult(next);
        if (needsMorePolling(next)) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    }

    if (needsMorePolling(result)) {
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [albumId]);

  return result;
}
