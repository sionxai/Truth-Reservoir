import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { CertV2Schema } from "../schema/cert-v2.ts";
import { loadInstitutionalMetrics, loadPropositions } from "../lib/data.ts";
import { encodePropositionId } from "../lib/ids.ts";
import { propositionsWithTag, tagRoute, uniqueTags } from "../lib/propositions.ts";
import { absoluteSiteUrl } from "../lib/site.ts";
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
    "/api/v2/index.json",
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

  const entries = [
    ...staticPaths.map((path) => ({ path, lastmod: generatedAt })),
    ...propositionPaths,
    ...tagPaths
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => sitemapUrl(entry.path, entry.lastmod)),
    "</urlset>",
    ""
  ].join("\n");
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
    propositions: propositions.map((proposition) => ({
      propositionId: proposition.propositionId,
      path: `/api/v2/propositions/${propositionFileId(proposition)}.json`
    }))
  }
};

await writeFile(`${apiDir}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
await writeFile(`${apiDir}/institutional-metrics.json`, `${JSON.stringify(metrics, null, 2)}\n`);
// NOTE: requests.json is NOT regenerated here. The deploy build must stay
// network-free/deterministic — a GitHub API call in the critical build path made
// Vercel deploys flaky and could wipe the live queue to empty on a transient
// failure. requests.json is a committed static file, refreshed by
// `npm run build-requests` (run locally or by the sync-requests GitHub Action on
// issue events, which commits the update and triggers a redeploy).
await writeFile("public/sitemap.xml", createSitemap(propositions, generatedAt));

const examples = await createExamples(propositions);
for (const [name, example] of Object.entries(examples)) {
  await writeFile(`${examplesDir}/${name}.json`, `${JSON.stringify(example, null, 2)}\n`);
}

// CONSTITUTION.md (repo root) is the single source of truth. Copy it into public/
// so the served copy can never silently drift from the canonical one (제8).
await copyFile("CONSTITUTION.md", "public/CONSTITUTION.md");

console.log(
  `Wrote ${propositions.length} proposition file(s) under propositions/, index.json, institutional metrics, and examples.`
);
