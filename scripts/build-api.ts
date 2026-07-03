import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { CertV2Schema } from "../schema/cert-v2.ts";
import { loadInstitutionalMetrics, loadPropositions } from "../lib/data.ts";
import { entityRegistry, entityRoute } from "../lib/entities.ts";
import { encodePropositionId } from "../lib/ids.ts";
import { propositionsWithTag, tagRoute, uniqueTags } from "../lib/propositions.ts";
import { sharedTags } from "../lib/relations.ts";
import { absoluteSiteUrl } from "../lib/site.ts";
import { allTopicSummaries } from "../lib/topics.ts";
import { applyDerivedHashes } from "../lib/verify.ts";
import type { Proposition } from "../lib/types.ts";

const apiDir = "public/api/v2";
const propositionsDir = `${apiDir}/propositions`;
const examplesDir = `${apiDir}/examples`;

// propositionId contains a colon (`stmt:...`) which is not filesystem/URL-safe,
// so the published file name replaces it with a dash. The PRD §7 contract path
// `/api/v2/propositions/{id}.json` resolves to this encoded id.
function propositionFileId(proposition: Proposition): string {
  return proposition.propositionId.replace(":", "-");
}

function sortForAgentDiscovery(propositions: Proposition[]): Proposition[] {
  return [...propositions].sort((left, right) => {
    const updated = right.updatedAt.localeCompare(left.updatedAt);
    if (updated !== 0) {
      return updated;
    }

    return left.propositionId.localeCompare(right.propositionId);
  });
}

function indexGeneratedAt(propositions: Proposition[]): string {
  return propositions
    .map((proposition) => proposition.updatedAt)
    .sort((left, right) => right.localeCompare(left))[0];
}

function dataVersion(generatedAt: string): string {
  // Snapshot version (PRD env NEXT_PUBLIC_DATA_VERSION, e.g. "2026.06.15").
  // Falls back to a dotted date derived from the newest updatedAt.
  return process.env.NEXT_PUBLIC_DATA_VERSION ?? generatedAt.slice(0, 10).replace(/-/g, ".");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sitemapUrl(path: string, lastmod: string): string {
  return [
    "  <url>",
    `    <loc>${xmlEscape(absoluteSiteUrl(path))}</loc>`,
    `    <lastmod>${xmlEscape(lastmod)}</lastmod>`,
    "  </url>"
  ].join("\n");
}

function createSitemap(propositions: Proposition[], generatedAt: string): string {
  const staticPaths = [
    "/",
    "/about",
    "/api-docs",
    "/llms.txt",
    "/llms-full.txt",
    "/api/v2/search-index.json",
    "/api/v2/index.json",
    "/api/v2/graph.json",
    "/api/v2/entities.json",
    "/api/v2/topics.json",
    "/api/v2/requests.json",
    "/api/v2/openapi.json",
    "/api/v2/schema/cert-v2.schema.json"
  ];

  const propositionPaths = propositions.flatMap((proposition) => {
    const dashId = encodePropositionId(proposition.propositionId);

    return [
      { path: `/p/${dashId}`, lastmod: proposition.updatedAt },
      { path: `/verify/${dashId}`, lastmod: proposition.updatedAt }
    ];
  });

  const tagPaths = uniqueTags(propositions).map((tag) => {
    const lastmod = propositionsWithTag(propositions, tag)
      .map((proposition) => proposition.updatedAt)
      .sort((left, right) => right.localeCompare(left))[0];

    return { path: tagRoute(tag), lastmod: lastmod ?? generatedAt };
  });

  const byId = new Map(propositions.map((proposition) => [proposition.propositionId, proposition]));
  const entityPaths = [...entityRegistry(propositions).values()].map((entry) => {
    const lastmod = entry.propositionIds
      .flatMap((propositionId) => {
        const proposition = byId.get(propositionId);

        return proposition ? [proposition.updatedAt] : [];
      })
      .sort((left, right) => right.localeCompare(left))[0];

    return { path: entityRoute(entry.slug), lastmod: lastmod ?? generatedAt };
  });

  const entries = [
    ...staticPaths.map((path) => ({ path, lastmod: generatedAt })),
    ...propositionPaths,
    ...tagPaths,
    ...entityPaths
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => sitemapUrl(entry.path, entry.lastmod)),
    "</urlset>",
    ""
  ].join("\n");
}

function createEntities(propositions: Proposition[], generatedAt: string) {
  const registry = entityRegistry(propositions);
  const entities = [...registry.entries()].map(([name, entry]) => ({
    name,
    slug: entry.slug,
    path: entityRoute(entry.slug),
    propositionCount: entry.propositionIds.length,
    propositionIds: entry.propositionIds,
    roles: entry.roles
  }));

  return {
    meta: {
      generatedAt,
      total: entities.length,
      note: "sixW.who/statedBy 기반 결정론적 파생; cert 원본 미저장; 탐색 허브(제15)"
    },
    entities
  };
}

function createTopics(propositions: Proposition[], generatedAt: string) {
  const topics = allTopicSummaries(propositions).map((summary) => ({
    tag: summary.tag,
    path: summary.path,
    count: summary.count,
    dateRange: summary.dateRange,
    propositionIds: summary.propositionIds
  }));

  return {
    meta: {
      generatedAt,
      total: topics.length,
      note: "태그 기반 결정론적 파생 주제 집계; 사건 시점 순; cert 원본 미저장"
    },
    topics
  };
}

async function createExamples(propositions: Proposition[]): Promise<Record<string, Proposition>> {
  const [base] = propositions;

  if (!base) {
    throw new Error("Cannot generate examples without at least one proposition");
  }

  const valid = structuredClone(base);

  const retracted = structuredClone(base);
  retracted.status = "retracted";
  retracted.updatedAt = "2026-06-15T00:00:01Z";
  retracted.assessment = {
    ...retracted.assessment,
    gradeRationale: `${retracted.assessment.gradeRationale} 예시 문서에서는 철회 상태 표현을 검증한다.`
  };

  const needsReview = structuredClone(base);
  needsReview.status = "needs_review";
  needsReview.updatedAt = "2026-06-15T00:00:02Z";
  needsReview.assessment = {
    ...needsReview.assessment,
    factualGrade: null,
    status: "undetermined",
    gradeRationale: "추가 원문 대조가 필요하다는 예시 상태이다."
  };
  needsReview.undeterminedItems = ["원문 대조 범위 확정 필요"];
  needsReview.openCorrectionRequests = 2;

  const sensitive = structuredClone(base);
  sensitive.updatedAt = "2026-06-15T00:00:03Z";
  sensitive.sensitive = {
    sensitive: true,
    sensitivityReason: ["political_claim"],
    legalStatus: "allegation",
    presumptionNotice: "민감 예시 문서는 사실확정이 아닌 검증 절차 설명용이다."
  };

  return {
    valid: CertV2Schema.parse(await applyDerivedHashes(valid)),
    retracted: CertV2Schema.parse(await applyDerivedHashes(retracted)),
    "needs-review": CertV2Schema.parse(await applyDerivedHashes(needsReview)),
    sensitive: CertV2Schema.parse(await applyDerivedHashes(sensitive))
  };
}

function createGraph(propositions: Proposition[], generatedAt: string) {
  const sorted = [...propositions].sort((left, right) =>
    left.propositionId.localeCompare(right.propositionId)
  );
  const edges: Array<{ from: string; to: string; sharedTags: string[] }> = [];

  for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
      const left = sorted[leftIndex];
      const right = sorted[rightIndex];
      const tags = sharedTags(left, right);

      if (tags.length) {
        edges.push({
          from: left.propositionId,
          to: right.propositionId,
          sharedTags: tags
        });
      }
    }
  }

  return {
    meta: {
      generatedAt,
      total: sorted.length,
      note: "태그 교집합 기반 결정론적 파생 관계; cert 원본에는 저장되지 않음"
    },
    nodes: sorted.map((proposition) => ({
      propositionId: proposition.propositionId,
      path: `/p/${encodePropositionId(proposition.propositionId)}/`,
      tags: [...proposition.tags].sort((left, right) => left.localeCompare(right, "ko"))
    })),
    edges
  };
}

function createSearchIndex(propositions: Proposition[], generatedAt: string) {
  const sorted = sortForAgentDiscovery(propositions);

  return {
    meta: {
      generatedAt,
      total: sorted.length,
      note: "Compact manifest for client-side filtering; fetch full records at /api/v2/propositions/{dashId}.json"
    },
    records: sorted.map((proposition) => ({
      propositionId: proposition.propositionId,
      path: `/api/v2/propositions/${propositionFileId(proposition)}.json`,
      canonical: proposition.canonicalProposition,
      tags: [...proposition.tags].sort((left, right) => left.localeCompare(right, "ko")),
      claimNature: proposition.claimNature,
      factualGrade: proposition.assessment.factualGrade,
      status: proposition.status,
      asOfDate: proposition.asOfDate,
      updatedAt: proposition.updatedAt
    }))
  };
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatCsv(values: string[]): string {
  return values.length ? values.join(", ") : "none";
}

function formatSixW(proposition: Proposition): string[] {
  if (!proposition.sixW) {
    return ["sixW: none"];
  }

  return [
    "sixW:",
    `  who: ${compactText(proposition.sixW.who)}`,
    `  when: ${compactText(proposition.sixW.when)}`,
    `  where: ${compactText(proposition.sixW.where)}`,
    `  what: ${compactText(proposition.sixW.what)}`,
    `  how: ${compactText(proposition.sixW.how)}`,
    proposition.sixW.why.length
      ? `  why: ${proposition.sixW.why
          .map((entry) => `${compactText(entry.reason)} (statedBy: ${compactText(entry.statedBy)})`)
          .join(" | ")}`
      : "  why: none"
  ];
}

function formatCorrectionHistory(proposition: Proposition): string[] {
  if (proposition.correctionHistory.length === 0) {
    return ["correctionHistory: none"];
  }

  return [
    "correctionHistory:",
    ...proposition.correctionHistory.map(
      (entry) =>
        `  - ${entry.date}: error=${compactText(entry.error)}; detectedBy=${compactText(
          entry.detectedBy
        )}; before=${compactText(entry.before)}; after=${compactText(
          entry.after
        )}; scoreChange=${compactText(entry.scoreChange)}; newVersionId=${entry.newVersionId}`
    )
  ];
}

function formatEvidence(proposition: Proposition): string[] {
  return [
    "evidence:",
    ...proposition.evidence.map(
      (entry) => `  - url: ${entry.url}; shortQuote: "${compactText(entry.shortQuote)}"`
    )
  ];
}

function formatLlmsFullRecord(proposition: Proposition): string[] {
  const dashId = encodePropositionId(proposition.propositionId);
  const tags = [...proposition.tags].sort((left, right) => left.localeCompare(right, "ko"));

  return [
    `=== ${proposition.propositionId} ===`,
    `propositionId: ${proposition.propositionId}`,
    `humanUrl: /p/${dashId}/`,
    `jsonUrl: /api/v2/propositions/${dashId}.json`,
    `canonicalProposition: ${compactText(proposition.canonicalProposition)}`,
    `factualGrade/status: ${proposition.assessment.factualGrade ?? "undetermined"} / ${
      proposition.status
    }`,
    `assessmentStatus: ${proposition.assessment.status}`,
    `claimNature: ${proposition.claimNature}`,
    `asOfDate: ${proposition.asOfDate}`,
    `updatedAt: ${proposition.updatedAt}`,
    ...formatSixW(proposition),
    ...formatCorrectionHistory(proposition),
    ...formatEvidence(proposition),
    `limitations: ${compactText(proposition.limitations)}`,
    `tags: ${formatCsv(tags)}`,
    ""
  ];
}

function createLlmsFull(propositions: Proposition[], generatedAt: string): string {
  const sorted = sortForAgentDiscovery(propositions);
  const lines = [
    "Truth Reservoir / 진실저수지",
    "",
    "Condensed orientation for AI agents:",
    "Truth Reservoir publishes static FACTS article pages paired one-to-one with Cert v2.1 JSON proposition records. CONSTITUTION.md governs; JSON Schema and OpenAPI are the authoritative machine contracts.",
    "",
    "Primary entrypoints (priority order):",
    "1. /api/v2/search-index.json — compact manifest (start here to find records)",
    "2. /api/v2/propositions/{dash-id}.json — full verified record",
    "3. /api/v2/index.json — full corpus with embedded records",
    "4. /api/v2/graph.json — relation graph (shared-tag edges)",
    "5. /api/v2/entities.json — derived entity hubs from sixW.who/statedBy",
    "6. /api/v2/topics.json — derived topic collections (tag-based, event-date ordered)",
    "7. /llms-full.txt — entire reservoir as one plain-text file",
    "",
    "Agent workflow: fetch /api/v2/search-index.json, filter locally by canonical/tags/claimNature/factualGrade/status/date, then fetch the matching /api/v2/propositions/{dash-id}.json records. Cite /p/{dash-id}/ for humans and JSON URLs for machines.",
    "Verification: recompute evidence quoteHash as sha256(shortQuote), propositionId from canonicalProposition plus language, then versionId and certHash from the Cert v2.1 derivation documented in /api/v2/schema/cert-v2.schema.json and /api/v2/openapi.json.",
    "Storage boundary: the reservoir stores verified propositions and evidence structures, not verdicts or interpretations (제2). Grade labels are secondary navigation signals.",
    "Entity hubs: /e/{slug}/ pages and /api/v2/entities.json are deterministic derived navigation layers from sixW.who and sixW.why[].statedBy only. They are not entity profiles and assert no facts about the entity itself (제15).",
    "",
    `generatedAt: ${generatedAt}`,
    `total: ${sorted.length}`,
    "recordOrder: updatedAt desc, then propositionId asc",
    "",
    ...sorted.flatMap(formatLlmsFullRecord)
  ];

  return `${lines.join("\n")}\n`;
}

const propositions = await loadPropositions();
const metrics = await loadInstitutionalMetrics();

// Clean regenerated trees so stale files never linger (schema/ is owned by schema-emit).
await rm(propositionsDir, { recursive: true, force: true });
await rm(examplesDir, { recursive: true, force: true });
await mkdir(propositionsDir, { recursive: true });
await mkdir(examplesDir, { recursive: true });

for (const proposition of propositions) {
  await writeFile(
    `${propositionsDir}/${propositionFileId(proposition)}.json`,
    `${JSON.stringify(proposition, null, 2)}\n`
  );
}

const generatedAt = indexGeneratedAt(propositions);

// PRD §7 contract: { data: Proposition[], meta: { total, dataVersion } }.
const index = {
  data: propositions,
  meta: {
    total: propositions.length,
    dataVersion: dataVersion(generatedAt),
    certVersion: "2.1",
    generatedAt,
    institutionalMetrics: {
      path: "/api/v2/institutional-metrics.json",
      status: metrics.status,
      totalEntries: metrics.totalEntries,
      totalAssessed: metrics.totalAssessed,
      openCorrectionRequests: metrics.correctionMetrics.openCorrectionRequests
    },
    entities: {
      path: "/api/v2/entities.json",
      status: "derived",
      note: "sixW.who/statedBy 기반 탐색 허브; Cert 원본에는 저장되지 않음"
    },
    propositions: propositions.map((proposition) => ({
      propositionId: proposition.propositionId,
      path: `/api/v2/propositions/${propositionFileId(proposition)}.json`
    }))
  }
};

await writeFile(`${apiDir}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
await writeFile(
  `${apiDir}/search-index.json`,
  `${JSON.stringify(createSearchIndex(propositions, generatedAt), null, 2)}\n`
);
await writeFile(
  `${apiDir}/graph.json`,
  `${JSON.stringify(createGraph(propositions, generatedAt), null, 2)}\n`
);
await writeFile(
  `${apiDir}/entities.json`,
  `${JSON.stringify(createEntities(propositions, generatedAt), null, 2)}\n`
);
await writeFile(
  `${apiDir}/topics.json`,
  `${JSON.stringify(createTopics(propositions, generatedAt), null, 2)}\n`
);
await writeFile(`${apiDir}/institutional-metrics.json`, `${JSON.stringify(metrics, null, 2)}\n`);
// NOTE: requests.json is NOT regenerated here. The deploy build must stay
// network-free/deterministic — a GitHub API call in the critical build path made
// Vercel deploys flaky and could wipe the live queue to empty on a transient
// failure. requests.json is a committed static file, refreshed by
// `npm run build-requests` (run locally or by the sync-requests GitHub Action on
// issue events, which commits the update and triggers a redeploy).
await writeFile("public/sitemap.xml", createSitemap(propositions, generatedAt));
await writeFile("public/llms-full.txt", createLlmsFull(propositions, generatedAt));

const examples = await createExamples(propositions);
for (const [name, example] of Object.entries(examples)) {
  await writeFile(`${examplesDir}/${name}.json`, `${JSON.stringify(example, null, 2)}\n`);
}

// CONSTITUTION.md (repo root) is the single source of truth. Copy it into public/
// so the served copy can never silently drift from the canonical one (제8).
await copyFile("CONSTITUTION.md", "public/CONSTITUTION.md");

console.log(
  `Wrote ${propositions.length} proposition file(s) under propositions/, index.json, search-index.json, graph.json, entities.json, topics.json, institutional metrics, llms-full.txt, and examples.`
);
