export type SourceTier =
  | "official_primary"
  | "music_database"
  | "journalistic"
  | "interview"
  | "specialized_publication"
  | "encyclopedic";

const TIER_RANK: Record<SourceTier, number> = {
  official_primary: 1,
  music_database: 2,
  journalistic: 3,
  interview: 4,
  specialized_publication: 5,
  encyclopedic: 6
};

export interface FactCandidate<T> {
  value: T;
  tier: SourceTier;
  providerName: string;
}

export interface ReconciledField<T> {
  value: T;
  discrepancy: boolean;
  conflictingValues?: Array<FactCandidate<T>>;
}

export class NoCandidatesError extends Error {
  constructor() {
    super("Cannot reconcile a field with zero candidates");
  }
}

export function reconcileField<T>(candidates: Array<FactCandidate<T>>): ReconciledField<T> {
  if (candidates.length === 0) {
    throw new NoCandidatesError();
  }

  const bestRank = Math.min(...candidates.map((c) => TIER_RANK[c.tier]));
  const topTierCandidates = candidates.filter((c) => TIER_RANK[c.tier] === bestRank);
  const distinctValues = new Set(topTierCandidates.map((c) => JSON.stringify(c.value)));

  if (distinctValues.size === 1) {
    return { value: topTierCandidates[0].value, discrepancy: false };
  }

  return {
    value: topTierCandidates[0].value,
    discrepancy: true,
    conflictingValues: topTierCandidates
  };
}
