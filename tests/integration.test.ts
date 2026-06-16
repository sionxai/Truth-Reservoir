import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CertV2Schema } from "../schema/cert-v2.ts";
import { loadPropositionFile, loadPropositions, listPropositionFiles } from "../lib/data.ts";
import { encodePropositionId } from "../lib/ids.ts";
import { applyDerivedHashes, verifyPropositionHashes } from "../lib/verify.ts";
import { readJsonFile } from "./test-utils.ts";

describe("data integration", () => {
  it("loads every data/propositions file with zero parse errors", async () => {
    const files = await listPropositionFiles();
    const errors: string[] = [];

    for (const file of files) {
      try {
        await loadPropositionFile(file);
      } catch (error) {
        errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    expect(errors).toEqual([]);
  });

  it("verifies derived hashes for all seeds with zero mismatches", async () => {
    const propositions = await loadPropositions();
    const mismatches: string[] = [];

    for (const proposition of propositions) {
      const propositionMismatches = await verifyPropositionHashes(proposition);
      mismatches.push(
        ...propositionMismatches.map(
          (mismatch) =>
            `${proposition.propositionId} ${mismatch.path}: expected ${mismatch.expected}, found ${mismatch.actual}`
        )
      );
    }

    expect(mismatches).toEqual([]);
  });

  it("parses Apollo 11 and round-trips through hash derivation", async () => {
    const propositions = await loadPropositions();
    const apollo = propositions.find((proposition) =>
      proposition.canonicalProposition.includes("아폴로 11호 달 착륙선")
    );

    expect(apollo).toBeDefined();
    expect(CertV2Schema.safeParse(apollo).success).toBe(true);

    if (!apollo) {
      return;
    }

    const roundTripped = await applyDerivedHashes(apollo);
    expect(roundTripped).toMatchObject({
      propositionId: apollo.propositionId,
      versionId: apollo.versionId,
      certHash: apollo.certHash
    });
  });

  it("validates built public API outputs", async () => {
    const propositions = await loadPropositions();
    const apiRoot = join(process.cwd(), "public", "api", "v2");
    const index = await readJsonFile<{
      data?: unknown;
      meta?: { total?: unknown; dataVersion?: unknown };
    }>(join(apiRoot, "index.json"));

    expect(Array.isArray(index.data)).toBe(true);
    expect(index.meta).toMatchObject({
      total: propositions.length,
      dataVersion: expect.any(String)
    });

    for (const proposition of propositions) {
      const dashId = encodePropositionId(proposition.propositionId);
      const published = await readJsonFile(join(apiRoot, "propositions", `${dashId}.json`));

      expect(CertV2Schema.safeParse(published).success, dashId).toBe(true);
    }

    const openapiPath = join(apiRoot, "openapi.json");
    const certSchemaPath = join(apiRoot, "schema", "cert-v2.schema.json");
    const openapi = await readJsonFile<{ openapi?: string }>(openapiPath);

    expect(existsSync(openapiPath)).toBe(true);
    expect(existsSync(certSchemaPath)).toBe(true);
    expect(openapi.openapi).toBe("3.1.0");
    await expect(readJsonFile(certSchemaPath)).resolves.toEqual(expect.any(Object));
  });
});
