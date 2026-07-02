import { describe, expect, it } from "vitest";
import { relatedPropositions } from "../lib/relations.ts";
import type { Proposition } from "../lib/types.ts";

function proposition(
  propositionId: string,
  tags: string[],
  updatedAt = "2026-01-01"
): Proposition {
  return {
    propositionId,
    tags,
    updatedAt
  } as Proposition;
}

describe("relatedPropositions", () => {
  it("scores candidates by shared-tag count", () => {
    const target = proposition("stmt:target0000000000000000", ["a", "b", "c"]);
    const oneShared = proposition("stmt:one000000000000000000", ["a", "x"]);
    const twoShared = proposition("stmt:two000000000000000000", ["a", "b"]);

    expect(relatedPropositions(target, [oneShared, target, twoShared])).toEqual([
      {
        proposition: twoShared,
        score: 2,
        sharedTags: ["a", "b"]
      },
      {
        proposition: oneShared,
        score: 1,
        sharedTags: ["a"]
      }
    ]);
  });

  it("uses updatedAt desc and propositionId asc as deterministic tie-breakers", () => {
    const target = proposition("stmt:target0000000000000000", ["shared"]);
    const newest = proposition("stmt:z000000000000000000000", ["shared"], "2026-01-03");
    const olderA = proposition("stmt:a000000000000000000000", ["shared"], "2026-01-02");
    const olderB = proposition("stmt:b000000000000000000000", ["shared"], "2026-01-02");

    expect(
      relatedPropositions(target, [olderB, newest, target, olderA]).map(
        (item) => item.proposition.propositionId
      )
    ).toEqual([newest.propositionId, olderA.propositionId, olderB.propositionId]);
  });

  it("excludes the target proposition even when it shares all tags with itself", () => {
    const target = proposition("stmt:target0000000000000000", ["shared"]);

    expect(relatedPropositions(target, [target])).toEqual([]);
  });

  it("returns an empty list when no candidate shares a tag", () => {
    const target = proposition("stmt:target0000000000000000", ["a"]);
    const candidate = proposition("stmt:candidate000000000000", ["b"]);

    expect(relatedPropositions(target, [target, candidate])).toEqual([]);
  });
});
