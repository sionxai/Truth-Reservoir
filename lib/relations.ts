import type { Proposition } from "./types.ts";

export interface RelatedProposition {
  proposition: Proposition;
  score: number;
  sharedTags: string[];
}

export function sharedTags(left: Proposition, right: Proposition): string[] {
  const rightTags = new Set(right.tags);
  const tags = new Set(left.tags.filter((tag) => rightTags.has(tag)));

  return [...tags].sort((a, b) => a.localeCompare(b, "ko"));
}

export function relatedPropositions(
  target: Proposition,
  all: Proposition[]
): RelatedProposition[] {
  return all
    .filter((candidate) => candidate.propositionId !== target.propositionId)
    .map((candidate) => {
      const candidateSharedTags = sharedTags(target, candidate);

      return {
        proposition: candidate,
        score: candidateSharedTags.length,
        sharedTags: candidateSharedTags
      };
    })
    .filter((candidate) => candidate.score >= 1)
    .sort((left, right) => {
      const score = right.score - left.score;
      if (score !== 0) {
        return score;
      }

      const updated = right.proposition.updatedAt.localeCompare(left.proposition.updatedAt);
      if (updated !== 0) {
        return updated;
      }

      return left.proposition.propositionId.localeCompare(right.proposition.propositionId);
    })
    .slice(0, 5);
}
