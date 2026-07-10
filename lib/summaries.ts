import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const SUMMARIES_DIR = path.join(process.cwd(), "data", "summaries");
export const SUMMARY_MAX_LENGTH = 500;

// AI 요약 사이드카 — cert 원본과 분리된 파생 레이어. cert 해시·버전에 영향을
// 주지 않으며, versionId가 현행 cert와 일치할 때만 렌더링된다(낡은 요약 차단).
export const SummarySidecarSchema = z.object({
  propositionId: z.string().regex(/^stmt:[a-f0-9]{24}$/),
  versionId: z.string().regex(/^ver:[a-f0-9]{16}$/),
  summary: z.string().min(1).max(SUMMARY_MAX_LENGTH),
  style: z.literal("column-v1"),
  generatedBy: z.literal("AI(독립된 검토자)"),
  generatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export type SummarySidecar = z.infer<typeof SummarySidecarSchema>;

export async function loadSummaries(): Promise<Map<string, SummarySidecar>> {
  const byProposition = new Map<string, SummarySidecar>();

  let files: string[];
  try {
    files = await readdir(SUMMARIES_DIR);
  } catch {
    return byProposition;
  }

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }

    const raw = await readFile(path.join(SUMMARIES_DIR, file), "utf8");
    // 형식 위반 사이드카는 조용히 넘기지 않고 빌드를 실패시킨다.
    const sidecar = SummarySidecarSchema.parse(JSON.parse(raw));
    byProposition.set(sidecar.propositionId, sidecar);
  }

  return byProposition;
}

// versionId가 일치하지 않으면 null — 정정·재검증으로 cert가 갱신되면
// 요약은 재생성 전까지 화면에서 내려간다.
export function summaryFor(
  summaries: Map<string, SummarySidecar>,
  proposition: { propositionId: string; versionId: string }
): SummarySidecar | null {
  const sidecar = summaries.get(proposition.propositionId);

  if (!sidecar || sidecar.versionId !== proposition.versionId) {
    return null;
  }

  return sidecar;
}
