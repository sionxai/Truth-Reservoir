import Fuse, { type IFuseOptions } from "fuse.js";
import type {
  Assessment,
  ClaimNature,
  Classification,
  Grade,
  Proposition,
  PropositionLanguage,
  PropositionStatus
} from "./types.ts";

export interface PropositionFilters {
  classification?: Classification;
  language?: PropositionLanguage;
  status?: PropositionStatus;
  factualGrade?: Grade;
  truthfulGrade?: Grade;
  assessmentStatus?: Assessment["status"];
  claimNature?: ClaimNature;
  tags?: string[];
}

export interface PropositionSearchQuery extends PropositionFilters {
  text?: string;
  limit?: number;
}

const fuseOptions: IFuseOptions<Proposition> = {
  includeScore: true,
  threshold: 0.32,
  ignoreLocation: true,
  keys: [
    { name: "canonicalProposition", weight: 0.55 },
    { name: "originalClaim", weight: 0.15 },
    { name: "limitations", weight: 0.1 },
    { name: "tags", weight: 0.1 },
    { name: "evidence.title", weight: 0.1 }
  ]
};

export function createPropositionSearchIndex(propositions: Proposition[]): Fuse<Proposition> {
  return new Fuse(propositions, fuseOptions);
}

export function filterPropositions(
  propositions: Proposition[],
  filters: PropositionFilters = {}
): Proposition[] {
  return propositions.filter((proposition) => {
    if (filters.classification && proposition.classification !== filters.classification) {
      return false;
    }

    if (filters.language && proposition.language !== filters.language) {
      return false;
    }

    if (filters.status && proposition.status !== filters.status) {
      return false;
    }

    if (
      filters.factualGrade &&
      proposition.assessment.factualGrade !== filters.factualGrade
    ) {
      return false;
    }

    if (
      filters.truthfulGrade &&
      proposition.assessment.truthfulGrade !== filters.truthfulGrade
    ) {
      return false;
    }

    if (
      filters.assessmentStatus &&
      proposition.assessment.status !== filters.assessmentStatus
    ) {
      return false;
    }

    if (filters.claimNature && proposition.claimNature !== filters.claimNature) {
      return false;
    }

    if (filters.tags?.length) {
      const propositionTags = new Set(proposition.tags);
      return filters.tags.every((tag) => propositionTags.has(tag));
    }

    return true;
  });
}

export function searchPropositions(
  propositions: Proposition[],
  query: PropositionSearchQuery = {}
): Proposition[] {
  const filtered = filterPropositions(propositions, query);
  const limit = query.limit ?? filtered.length;

  if (!query.text?.trim()) {
    return filtered.slice(0, limit);
  }

  return createPropositionSearchIndex(filtered)
    .search(query.text.trim(), { limit })
    .map((result) => result.item);
}
