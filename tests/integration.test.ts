import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CertV2Schema } from "../schema/cert-v2.ts";
import { loadPropositionFile, loadPropositions, listPropositionFiles } from "../lib/data.ts";
import { entityRegistry, entityRoute } from "../lib/entities.ts";
import { encodePropositionId } from "../lib/ids.ts";
import { tagRoute, uniqueTags } from "../lib/propositions.ts";
import { topicSummary } from "../lib/topics.ts";
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
    const searchIndex = await readJsonFile<{
      meta?: { total?: unknown; note?: unknown };
      records?: Array<{ propositionId?: string; path?: string; canonical?: string }>;
    }>(join(apiRoot, "search-index.json"));
    const graph = await readJsonFile<{
      meta?: { total?: unknown; note?: unknown };
      nodes?: Array<{ propositionId?: string; path?: string; tags?: unknown }>;
      edges?: Array<{ from?: string; to?: string; sharedTags?: unknown }>;
    }>(join(apiRoot, "graph.json"));
    const entities = await readJsonFile<{
      meta?: { total?: unknown; note?: unknown };
      entities?: Array<{
        name?: string;
        slug?: string;
        path?: string;
        propositionCount?: number;
        propositionIds?: string[];
        roles?: { who?: string[]; statedBy?: string[] };
      }>;
    }>(join(apiRoot, "entities.json"));
    const topics = await readJsonFile<{
      meta?: { total?: unknown; note?: unknown };
      topics?: Array<{
        tag?: string;
        path?: string;
        count?: number;
        dateRange?: { from?: string | null; to?: string | null };
        propositionIds?: string[];
      }>;
    }>(join(apiRoot, "topics.json"));
    const requests = await readJsonFile<{
      meta?: { repo?: unknown; total?: unknown; note?: unknown };
      requests?: unknown;
    }>(join(apiRoot, "requests.json"));
    const llmsFull = await readFile(join(process.cwd(), "public", "llms-full.txt"), "utf8");
    const propositionIds = propositions.map((proposition) => proposition.propositionId).sort();

    expect(propositions.length).toBeGreaterThan(0);
    expect(Array.isArray(index.data)).toBe(true);
    expect((index.data as unknown[]).length).toBe(propositions.length);
    expect(index.meta).toMatchObject({
      total: propositions.length,
      dataVersion: expect.any(String)
    });

    expect(searchIndex.meta).toMatchObject({
      total: propositions.length,
      note: expect.stringContaining("Compact manifest")
    });
    expect(searchIndex.records).toHaveLength(propositions.length);
    expect(searchIndex.records?.map((record) => record.propositionId).sort()).toEqual(
      propositionIds
    );
    expect(searchIndex.records?.[0]).toMatchObject({
      propositionId: expect.stringMatching(/^stmt:[a-f0-9]{24}$/),
      path: expect.stringMatching(/^\/api\/v2\/propositions\/stmt-[a-f0-9]{24}\.json$/),
      canonical: expect.any(String)
    });

    expect(llmsFull).toContain("Primary entrypoints (priority order):");
    expect((llmsFull.match(/^=== stmt:[a-f0-9]{24} ===$/gm) ?? [])).toHaveLength(
      propositions.length
    );
    for (const propositionId of propositionIds) {
      expect(llmsFull).toContain(`propositionId: ${propositionId}`);
    }

    expect(graph.meta).toMatchObject({
      total: propositions.length,
      note: expect.stringContaining("태그 교집합")
    });
    expect(graph.nodes).toHaveLength(propositions.length);
    expect(graph.nodes?.[0]).toMatchObject({
      propositionId: expect.stringMatching(/^stmt:[a-f0-9]{24}$/),
      path: expect.stringMatching(/^\/p\/stmt-[a-f0-9]{24}\/$/)
    });
    expect(Array.isArray(graph.edges)).toBe(true);
    for (const edge of graph.edges ?? []) {
      expect(edge.from && edge.to ? edge.from < edge.to : false).toBe(true);
      expect(Array.isArray(edge.sharedTags)).toBe(true);
      expect((edge.sharedTags as unknown[]).length).toBeGreaterThan(0);
    }

    const registry = entityRegistry(propositions);
    expect(entities.meta).toMatchObject({
      total: registry.size,
      note: expect.stringContaining("sixW.who/statedBy")
    });
    expect(entities.entities).toHaveLength(registry.size);
    expect(entities.entities?.map((entity) => entity.name).sort()).toEqual(
      [...registry.keys()].sort()
    );
    for (const entity of entities.entities ?? []) {
      expect(entity.slug).toMatch(/^e-[A-Za-z0-9_-]+$/);
      expect(entity.path).toBe(`/e/${entity.slug}`);
      expect(entity.propositionCount).toBe(entity.propositionIds?.length);
      expect(entity.propositionIds?.length).toBeGreaterThan(0);
      expect(Array.isArray(entity.roles?.who)).toBe(true);
      expect(Array.isArray(entity.roles?.statedBy)).toBe(true);
    }

    // Derived topics.json: exists, covers every tag once, and each topic's
    // propositionIds are in the deterministic event-date order (제14).
    const allTags = uniqueTags(propositions);
    expect(topics.meta).toMatchObject({
      total: allTags.length,
      note: expect.stringContaining("사건 시점 순")
    });
    expect(topics.topics?.map((topic) => topic.tag).sort()).toEqual([...allTags].sort());
    for (const topic of topics.topics ?? []) {
      expect(topic.tag).toBeTruthy();
      const expected = topicSummary(topic.tag as string, propositions);
      expect(topic.path).toBe(tagRoute(topic.tag as string));
      expect(topic.count).toBe(expected.count);
      expect(topic.propositionIds).toEqual(expected.propositionIds);
      expect(topic.dateRange).toEqual(expected.dateRange);
    }

    for (const proposition of propositions) {
      const dashId = encodePropositionId(proposition.propositionId);
      const published = await readJsonFile(join(apiRoot, "propositions", `${dashId}.json`));

      expect(CertV2Schema.safeParse(published).success, dashId).toBe(true);
    }

    const openapiPath = join(apiRoot, "openapi.json");
    const certSchemaPath = join(apiRoot, "schema", "cert-v2.schema.json");
    const openapi = await readJsonFile<{ openapi?: string; paths?: Record<string, unknown> }>(
      openapiPath
    );

    expect(existsSync(openapiPath)).toBe(true);
    expect(existsSync(certSchemaPath)).toBe(true);
    expect(openapi.openapi).toBe("3.1.0");
    expect(openapi.paths).toHaveProperty("/api/v2/entities.json");
    expect(openapi.paths).toHaveProperty("/api/v2/topics.json");
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
      "<loc>https://truth-reservoir.vercel.app/api/v2/search-index.json</loc>"
    );
    expect(sitemap).toContain("<loc>https://truth-reservoir.vercel.app/llms-full.txt</loc>");
    expect(sitemap).toContain(
      "<loc>https://truth-reservoir.vercel.app/api/v2/index.json</loc>"
    );
    expect(sitemap).toContain(
      "<loc>https://truth-reservoir.vercel.app/api/v2/graph.json</loc>"
    );
    expect(sitemap).toContain(
      "<loc>https://truth-reservoir.vercel.app/api/v2/entities.json</loc>"
    );
    expect(sitemap).toContain(
      "<loc>https://truth-reservoir.vercel.app/api/v2/topics.json</loc>"
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

    for (const entry of entityRegistry(propositions).values()) {
      expect(sitemap).toContain(
        `<loc>https://truth-reservoir.vercel.app${entityRoute(entry.slug)}</loc>`
      );
    }
  });
});
