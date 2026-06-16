import { describe, expect, it } from "vitest";
import { loadPropositions } from "../lib/data.ts";
import {
  applyDerivedHashes,
  deriveCertHash,
  deriveHashes,
  derivePropositionId,
  deriveQuoteHash,
  normalizeProposition,
  verifyPropositionHashes
} from "../lib/verify.ts";
import type { Proposition } from "../lib/types.ts";
import { cloneProposition, findPredecessorSeed } from "./test-utils.ts";

const versionRevisionCases: Array<[string, (seed: Proposition) => Proposition]> = [
  [
    "assessment grades",
    (seed) => {
      const next = cloneProposition(seed);
      next.assessment.factualGrade = "largely_reliable";
      return next;
    }
  ],
  [
    "reviewer",
    (seed) => {
      const next = cloneProposition(seed);
      next.reviewLog.humanReview.reviewer = "independent-reviewer";
      return next;
    }
  ],
  [
    "updatedAt",
    (seed) => {
      const next = cloneProposition(seed);
      next.updatedAt = "2026-06-16T00:00:00Z";
      return next;
    }
  ],
  [
    "asOfDate",
    (seed) => {
      const next = cloneProposition(seed);
      next.asOfDate = "2026-06-16";
      return next;
    }
  ]
];

describe("verify helpers", () => {
  it("normalizeProposition collapses whitespace and normalizes to NFC", () => {
    expect(normalizeProposition("  개인정보\n\t보호법  ")).toBe("개인정보 보호법");
    expect(normalizeProposition("e\u0301")).toBe("é");
  });

  it("derivePropositionId is deterministic and stable", async () => {
    const propositions = await loadPropositions();
    const [seed] = propositions;

    expect(seed).toBeDefined();

    const first = await derivePropositionId(seed.canonicalProposition, seed.language);
    const second = await derivePropositionId(seed.canonicalProposition, seed.language);

    expect(first).toBe(seed.propositionId);
    expect(second).toBe(first);
  });

  it.each(versionRevisionCases)(
    "keeps propositionId invariant while versionId changes for %s revisions",
    async (_label, revise) => {
      const propositions = await loadPropositions();
      const seed = findPredecessorSeed(propositions);
      const base = await applyDerivedHashes(seed);
      const derived = await applyDerivedHashes(revise(seed));

      expect(derived.propositionId).toBe(base.propositionId);
      expect(derived.versionId).not.toBe(base.versionId);
    }
  );

  it("round-trips derived hashes for every real seed", async () => {
    const propositions = await loadPropositions();

    for (const proposition of propositions) {
      const withPlaceholders = cloneProposition(proposition);
      withPlaceholders.propositionId = "stmt:000000000000000000000000";
      withPlaceholders.versionId = "ver:0000000000000000";
      withPlaceholders.certHash =
        "sha256:0000000000000000000000000000000000000000000000000000000000000000";
      withPlaceholders.evidence = withPlaceholders.evidence.map((evidence) => ({
        ...evidence,
        quoteHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      }));

      const derived = await applyDerivedHashes(withPlaceholders);

      expect(derived.propositionId).toBe(proposition.propositionId);
      expect(derived.versionId).toBe(proposition.versionId);
      expect(derived.certHash).toBe(await deriveCertHash(derived));
      await expect(verifyPropositionHashes(derived)).resolves.toEqual([]);
    }
  });

  it("reports no hash mismatches for each real seed", async () => {
    const propositions = await loadPropositions();

    for (const proposition of propositions) {
      await expect(verifyPropositionHashes(proposition), proposition.propositionId).resolves.toEqual(
        []
      );
    }
  });

  it("quoteHash is the sha256 of shortQuote", async () => {
    const propositions = await loadPropositions();

    for (const proposition of propositions) {
      for (const evidence of proposition.evidence) {
        await expect(deriveQuoteHash(evidence)).resolves.toBe(evidence.quoteHash);
      }
    }
  });

  it("reports mismatches for corrupted certHash, versionId, and quoteHash paths", async () => {
    const [seed] = await loadPropositions();

    const corruptedCertHash = cloneProposition(seed);
    corruptedCertHash.certHash =
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    const corruptedVersionId = cloneProposition(seed);
    corruptedVersionId.versionId = "ver:ffffffffffffffff";

    const corruptedQuoteHash = cloneProposition(seed);
    corruptedQuoteHash.evidence[0] = {
      ...corruptedQuoteHash.evidence[0],
      quoteHash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    };

    await expect(verifyPropositionHashes(corruptedCertHash)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "certHash" })])
    );
    await expect(verifyPropositionHashes(corruptedVersionId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "versionId" })])
    );
    await expect(verifyPropositionHashes(corruptedQuoteHash)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "evidence[0].quoteHash" })])
    );
  });

  it("deriveHashes mirrors stored seed identifiers", async () => {
    const propositions = await loadPropositions();

    for (const proposition of propositions) {
      await expect(deriveHashes(proposition)).resolves.toMatchObject({
        propositionId: proposition.propositionId,
        versionId: proposition.versionId,
        certHash: proposition.certHash
      });
    }
  });
});
