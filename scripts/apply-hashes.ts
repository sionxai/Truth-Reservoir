import { readFile, writeFile } from "node:fs/promises";
import { CertV2Schema } from "../schema/cert-v2.ts";
import { applyDerivedHashes } from "../lib/verify.ts";
import type { Proposition } from "../lib/types.ts";

/**
 * Deterministic hash-stamping for a single draft proposition.
 *
 * This is mechanical, reproducible tooling (like build-api / hash-verify): it
 * computes the canonical propositionId/versionId/certHash/quoteHash from content
 * the verification process already decided. It makes NO verification judgement —
 * grades, red-team conclusions and source assessments are filled in beforehand
 * (by the private ingest skill + human reviewer). Keeping this in the public repo
 * lets anyone reproduce the identifiers; the production *means* stay private (G6).
 *
 * Usage: npm run hash:apply -- data/propositions/<slug>.json
 * The draft must already contain every content field (canonicalProposition,
 * language, evidence[].shortQuote, assessment, reviewLog, ...). Id/hash fields
 * may be omitted or set to placeholders; they are overwritten here.
 */
const PLACEHOLDER_SHA = `sha256:${"0".repeat(64)}`;

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run hash:apply -- <path-to-proposition.json>");
  process.exit(1);
}

const raw = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
raw.propositionId ??= "stmt:000000000000000000000000";
raw.versionId ??= "ver:0000000000000000";
raw.certHash ??= PLACEHOLDER_SHA;
for (const evidence of (raw.evidence as Array<Record<string, unknown>>) ?? []) {
  evidence.quoteHash ??= PLACEHOLDER_SHA;
}

// Schema-parse FIRST so Zod defaults (e.g. openCorrectionRequests, tags) are
// materialized BEFORE hashing — otherwise certHash would be computed over an
// object missing its defaulted fields, then those fields get written in, leaving
// stored certHash inconsistent with the recomputed one.
const parsed = CertV2Schema.safeParse(raw);
if (!parsed.success) {
  console.error(`Draft is not schema-valid. Fix these, then re-run:`);
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

let stamped: Proposition;
try {
  stamped = await applyDerivedHashes(parsed.data);
} catch (error) {
  console.error(`Failed to derive hashes for ${file}:`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

await writeFile(file, `${JSON.stringify(stamped, null, 2)}\n`);
console.log(`Applied canonical hashes to ${file}`);
console.log(`  propositionId: ${stamped.propositionId}`);
console.log(`  versionId:     ${stamped.versionId}`);
console.log(`  certHash:      ${stamped.certHash}`);
