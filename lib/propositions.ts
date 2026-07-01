import type { Proposition } from "./types.ts";

export function sortByUpdatedDesc(propositions: Proposition[]): Proposition[] {
  return [...propositions].sort((left, right) => {
    const updated = right.updatedAt.localeCompare(left.updatedAt);
    if (updated !== 0) {
      return updated;
    }

    const created = right.createdAt.localeCompare(left.createdAt);
    if (created !== 0) {
      return created;
    }

    return left.propositionId.localeCompare(right.propositionId);
  });
}

export function sortByUpdatedAsc(propositions: Proposition[]): Proposition[] {
  return [...propositions].sort((left, right) => {
    const updated = left.updatedAt.localeCompare(right.updatedAt);
    if (updated !== 0) {
      return updated;
    }

    const created = left.createdAt.localeCompare(right.createdAt);
    if (created !== 0) {
      return created;
    }

    return left.propositionId.localeCompare(right.propositionId);
  });
}

export function uniqueTags(propositions: Proposition[]): string[] {
  return [...new Set(propositions.flatMap((proposition) => proposition.tags))].sort((left, right) =>
    left.localeCompare(right, "ko")
  );
}

export function propositionsWithTag(propositions: Proposition[], tag: string): Proposition[] {
  return propositions.filter((proposition) => proposition.tags.includes(tag));
}

export function tagRoute(tag: string): string {
  return `/t/${encodeURIComponent(tag)}`;
}

export function sourceCount(proposition: Proposition): number {
  return new Set(proposition.evidence.map((evidence) => evidence.url)).size;
}
