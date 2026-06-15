import { sha256hex, sha256Prefixed } from "./hash.ts";
import type { EvidenceItem, Proposition, PropositionLanguage } from "./types.ts";

type JsonObject = Record<string, unknown>;

export interface EvidenceSpanHashResult {
  evidenceIndex: number;
  expected: string;
  actual: string;
}

export interface DerivedHashes {
  propositionId: string;
  versionId: string;
  certHash: string;
  evidenceSpanHashes: EvidenceSpanHashResult[];
}

export interface HashMismatch {
  path: string;
  expected: string;
  actual: string;
}

export function normalizeProposition(text: string): string {
  return text.trim().replace(/\s+/g, " ").normalize("NFC");
}

export function canonicalize(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error("Cannot canonicalize a non-finite number");
      }
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "object": {
      const entries = Object.entries(value as JsonObject)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

      return `{${entries
        .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`)
        .join(",")}}`;
    }
    default:
      throw new Error(`Cannot canonicalize value of type ${typeof value}`);
  }
}

export function certCanonicalJson(cert: Proposition): string {
  const { certHash: _certHash, ...withoutCertHash } = cert;
  return canonicalize(withoutCertHash);
}

export async function derivePropositionId(
  canonicalProposition: string,
  language: PropositionLanguage
): Promise<string> {
  const normalized = normalizeProposition(canonicalProposition);
  const digest = await sha256hex(`${normalized}\n${language}`);
  return `stmt:${digest.slice(0, 24)}`;
}

/**
 * versionId identifies a distinct verification version. It is derived from the
 * FULL cert content (every field except versionId and certHash) so that ANY
 * material change to the verification — assessment, reviewer, asOfDate, evidence,
 * corrections, updatedAt — yields a new versionId. This closes the silent-edit
 * gap (PRD §0/G5: 조용한 수정 금지): a changed reviewer or asOfDate that did not
 * bump updatedAt would otherwise share the previous versionId. propositionId
 * stays stable (separate derivation) so URLs survive corrections.
 */
export async function deriveVersionId(cert: Proposition): Promise<string> {
  const { versionId: _versionId, certHash: _certHash, ...versionedContent } = cert;
  const digest = await sha256hex(canonicalize(versionedContent));
  return `ver:${digest.slice(0, 16)}`;
}

export async function deriveEvidenceSpanHash(evidence: EvidenceItem): Promise<string> {
  if (!evidence.shortQuote) {
    throw new Error(
      "Cannot recompute spanHash without shortQuote. Cert v2 stores snippet hashes, not remote source bodies."
    );
  }

  return sha256Prefixed(evidence.shortQuote);
}

export async function deriveCertHash(cert: Proposition): Promise<string> {
  return sha256Prefixed(certCanonicalJson(cert));
}

export async function deriveHashes(cert: Proposition): Promise<DerivedHashes> {
  const nextCert = structuredClone(cert);
  const propositionId = await derivePropositionId(nextCert.canonicalProposition, nextCert.language);

  nextCert.propositionId = propositionId;
  nextCert.evidence = await Promise.all(
    nextCert.evidence.map(async (evidence) => ({
      ...evidence,
      spanHash: await deriveEvidenceSpanHash(evidence)
    }))
  );

  const versionId = await deriveVersionId(nextCert);
  nextCert.versionId = versionId;

  const certHash = await deriveCertHash(nextCert);
  const evidenceSpanHashes = nextCert.evidence.map((evidence, evidenceIndex) => ({
    evidenceIndex,
    expected: evidence.spanHash,
    actual: cert.evidence[evidenceIndex]?.spanHash ?? ""
  }));

  return {
    propositionId,
    versionId,
    certHash,
    evidenceSpanHashes
  };
}

export async function applyDerivedHashes(cert: Proposition): Promise<Proposition> {
  const nextCert = structuredClone(cert);

  nextCert.propositionId = await derivePropositionId(
    nextCert.canonicalProposition,
    nextCert.language
  );

  nextCert.evidence = await Promise.all(
    nextCert.evidence.map(async (evidence) => ({
      ...evidence,
      spanHash: await deriveEvidenceSpanHash(evidence)
    }))
  );

  nextCert.versionId = await deriveVersionId(nextCert);
  nextCert.certHash = await deriveCertHash(nextCert);

  return nextCert;
}

export async function verifyPropositionHashes(cert: Proposition): Promise<HashMismatch[]> {
  const derived = await deriveHashes(cert);
  const mismatches: HashMismatch[] = [];

  if (cert.propositionId !== derived.propositionId) {
    mismatches.push({
      path: "propositionId",
      expected: derived.propositionId,
      actual: cert.propositionId
    });
  }

  if (cert.versionId !== derived.versionId) {
    mismatches.push({
      path: "versionId",
      expected: derived.versionId,
      actual: cert.versionId
    });
  }

  if (cert.certHash !== derived.certHash) {
    mismatches.push({
      path: "certHash",
      expected: derived.certHash,
      actual: cert.certHash
    });
  }

  for (const spanHash of derived.evidenceSpanHashes) {
    if (spanHash.actual !== spanHash.expected) {
      mismatches.push({
        path: `evidence[${spanHash.evidenceIndex}].spanHash`,
        expected: spanHash.expected,
        actual: spanHash.actual
      });
    }
  }

  return mismatches;
}

/*
 * Cert v2 identity derivation:
 * - propositionId = "stmt:" + sha256hex(normalizeProposition(canonicalProposition) + "\n" + language).slice(0, 24)
 * - versionId = "ver:" + sha256hex(canonicalJson(cert without versionId & certHash)).slice(0, 16)
 * - certHash = "sha256:" + sha256hex(canonicalJson(certWithoutCertHash))
 * - spanHash = "sha256:" + sha256hex(shortQuote)
 *
 * PRD sample IDs are illustrative and not reverse-engineerable. Seed IDs are
 * computed from this algorithm. Because full source bodies are not stored for
 * copyright reasons, spanHash verifies the integrity of the stored snippet
 * (`shortQuote`) rather than the remote body. Evidence offsets still describe
 * the quote location in the cited source.
 */
