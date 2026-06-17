import Link from "next/link";
import { encodePropositionId } from "../../lib/ids.ts";
import { getRepoUrl } from "../../lib/site.ts";
import type { Proposition } from "../../lib/types.ts";

interface DetailActionsProps {
  proposition: Proposition;
}

export function DetailActions({ proposition }: DetailActionsProps) {
  const dashId = encodePropositionId(proposition.propositionId);
  const repoUrl = getRepoUrl();
  const rawPath = `/api/v2/propositions/${dashId}.json`;
  const issueUrl = buildCorrectionIssueUrl(repoUrl, proposition);
  const editUrl = `${repoUrl}/edit/main/public/api/v2/propositions/${dashId}.json`;

  return (
    <aside className="detail-actions" aria-label="재현 및 정정 링크">
      <section className="content-panel action-card">
        <h2>Raw JSON</h2>
        <a className="button-link secondary" href={rawPath} download>
          JSON 다운로드
        </a>
      </section>

      <section className="content-panel action-card">
        <h2>재현</h2>
        <p>브라우저에서 저장된 스냅샷 해시와 버전 해시를 다시 계산합니다.</p>
        <Link className="button-link" href={`/verify/${dashId}`}>
          해시 재현
        </Link>
      </section>

      <section className="content-panel action-card">
        <h2>정정 제안</h2>
        <p>문제 지점, 반대 증거 출처, 제안 수정안을 남길 수 있습니다.</p>
        <a className="button-link" href={issueUrl} target="_blank" rel="noreferrer">
          GitHub Issue 열기
        </a>
        <a className="button-link secondary" href={editUrl} target="_blank" rel="noreferrer">
          JSON 파일 편집(PR)
        </a>
      </section>
    </aside>
  );
}

function buildCorrectionIssueUrl(repoUrl: string, proposition: Proposition): string {
  const params = new URLSearchParams({
    title: `[Correction] ${proposition.propositionId}`,
    body: [
      `propositionId: ${proposition.propositionId}`,
      `versionId: ${proposition.versionId}`,
      "",
      "problem:",
      "",
      "counter-evidence source:",
      "",
      "suggested fix:",
      ""
    ].join("\n")
  });

  return `${repoUrl}/issues/new?${params.toString()}`;
}
