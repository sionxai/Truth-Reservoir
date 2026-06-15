import { mkdir, rm, writeFile } from "node:fs/promises";
import { CertV2Schema } from "../schema/cert-v2.ts";
import { loadInstitutionalMetrics, loadPropositions } from "../lib/data.ts";
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
    truthfulGrade: null,
    status: "undetermined",
    gradeRationale: "추가 원문 대조가 필요하다는 예시 상태이다.",
    gradeDivergenceNote: undefined
  };
  needsReview.undeterminedItems = ["원문 대조 범위 확정 필요"];

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
    certVersion: "2.0",
    generatedAt,
    institutionalMetrics: {
      path: "/api/v2/institutional-metrics.json",
      status: metrics.status,
      totalPropositionsVerified: metrics.totalPropositionsVerified
    },
    propositions: propositions.map((proposition) => ({
      propositionId: proposition.propositionId,
      path: `/api/v2/propositions/${propositionFileId(proposition)}.json`
    }))
  }
};

await writeFile(`${apiDir}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
await writeFile(`${apiDir}/institutional-metrics.json`, `${JSON.stringify(metrics, null, 2)}\n`);

const examples = await createExamples(propositions);
for (const [name, example] of Object.entries(examples)) {
  await writeFile(`${examplesDir}/${name}.json`, `${JSON.stringify(example, null, 2)}\n`);
}

console.log(
  `Wrote ${propositions.length} proposition file(s) under propositions/, index.json, institutional metrics, and examples.`
);
