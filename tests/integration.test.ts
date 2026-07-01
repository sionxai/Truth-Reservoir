import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CertV2Schema } from "../schema/cert-v2.ts";
import { loadPropositionFile, loadPropositions, listPropositionFiles } from "../lib/data.ts";
import { encodePropositionId } from "../lib/ids.ts";
import { tagRoute, uniqueTags } from "../lib/propositions.ts";
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
    const requests = await readJsonFile<{
      meta?: { repo?: unknown; total?: unknown; note?: unknown };
      requests?: unknown;
    }>(join(apiRoot, "requests.json"));

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

    expect(Array.isArray(requests.requests)).toBe(true);
    expect(requests.meta).toMatchObject({
      repo: "sionxai/Truth-Reservoir",
      total: Array.isArray(requests.requests) ? requests.requests.length : 0,
      note: expect.stringContaining("DEMAND")
    });
  });

  it("publishes discovery files for crawlers and machine clients", async () => {
    const propositions = await loadPropositions();
    const publicRoot = join(process.cwd(), "public");
    const sitemap = await readFile(join(publicRoot, "sitemap.xml"), "utf8");
    const robots = await readFile(join(publicRoot, "robots.txt"), "utf8");

    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Sitemap: https://truth-reservoir.vercel.app/sitemap.xml");
    expect(robots).toContain("/llms.txt");
    expect(robots).toContain("/api/v2/openapi.json");

    expect(sitemap).toContain("<loc>https://truth-reservoir.vercel.app/</loc>");
    expect(sitemap).toContain(
      "<loc>https://truth-reservoir.vercel.app/api/v2/index.json</loc>"
    );
    expect(sitemap).toContain(
      "<loc>https://truth-reservoir.vercel.app/api/v2/requests.json</loc>"
    );
    expect(sitemap).toContain(
      "<loc>https://truth-reservoir.vercel.app/api/v2/openapi.json</loc>"
    );

    for (const proposition of propositions) {
      const dashId = encodePropositionId(proposition.propositionId);

      expect(sitemap).toContain(`<loc>https://truth-reservoir.vercel.app/p/${dashId}</loc>`);
      expect(sitemap).toContain(
        `<loc>https://truth-reservoir.vercel.app/verify/${dashId}</loc>`
      );
    }

    for (const tag of uniqueTags(propositions)) {
      expect(sitemap).toContain(
        `<loc>https://truth-reservoir.vercel.app${tagRoute(tag)}</loc>`
      );
    }
  });
});
