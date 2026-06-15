"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sha256Prefixed } from "../../lib/hash.ts";
import { encodePropositionId } from "../../lib/ids.ts";
import { deriveCertHash, derivePropositionId, deriveVersionId } from "../../lib/verify.ts";
import type { Proposition } from "../../lib/types.ts";

interface HashVerificationProps {
  proposition: Proposition;
}

type CheckStatus = "pending" | "match" | "mismatch" | "unavailable";

interface HashCheck {
  label: string;
  expected: string;
  actual: string;
  status: CheckStatus;
  note?: string;
}

interface VerificationState {
  running: boolean;
  spanChecks: HashCheck[];
  versionChecks: HashCheck[];
  error?: string;
}

export function HashVerification({ proposition }: HashVerificationProps) {
  const [retryToken, setRetryToken] = useState(0);
  const [state, setState] = useState<VerificationState>({
    running: true,
    spanChecks: [],
    versionChecks: []
  });

  useEffect(() => {
    let cancelled = false;

    async function runVerification() {
      setState({ running: true, spanChecks: [], versionChecks: [] });

      try {
        const spanChecks = await Promise.all(
          proposition.evidence.map(async (evidence, index): Promise<HashCheck> => {
            if (!evidence.shortQuote) {
              return {
                label: `E${index + 1} spanHash`,
                expected: evidence.spanHash,
                actual: "shortQuote 없음",
                status: "unavailable",
                note: "shortQuote가 없어 브라우저에서 재계산할 수 없습니다."
              };
            }

            const actual = await sha256Prefixed(evidence.shortQuote);

            return {
              label: `E${index + 1} spanHash`,
              expected: evidence.spanHash,
              actual,
              status: actual === evidence.spanHash ? "match" : "mismatch"
            };
          })
        );

        const propositionId = await derivePropositionId(
          proposition.canonicalProposition,
          proposition.language
        );
        const reconstructed = structuredClone(proposition);
        reconstructed.propositionId = propositionId;
        reconstructed.evidence = reconstructed.evidence.map((evidence, index) => {
          const spanCheck = spanChecks[index];
          return spanCheck?.status === "match" || spanCheck?.status === "mismatch"
            ? { ...evidence, spanHash: spanCheck.actual }
            : evidence;
        });
        // versionId is derived from the full reconstructed cert (minus versionId/certHash),
        // matching applyDerivedHashes ordering: propositionId + spanHashes set first.
        const versionId = await deriveVersionId(reconstructed);
        reconstructed.versionId = versionId;
        const certHash = await deriveCertHash(reconstructed);

        const versionChecks: HashCheck[] = [
          {
            label: "propositionId",
            expected: proposition.propositionId,
            actual: propositionId,
            status: propositionId === proposition.propositionId ? "match" : "mismatch"
          },
          {
            label: "versionId",
            expected: proposition.versionId,
            actual: versionId,
            status: versionId === proposition.versionId ? "match" : "mismatch"
          },
          {
            label: "certHash",
            expected: proposition.certHash,
            actual: certHash,
            status: certHash === proposition.certHash ? "match" : "mismatch"
          }
        ];

        if (!cancelled) {
          setState({ running: false, spanChecks, versionChecks });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            running: false,
            spanChecks: [],
            versionChecks: [],
            error: error instanceof Error ? error.message : "해시 계산 중 오류가 발생했습니다."
          });
        }
      }
    }

    runVerification();

    return () => {
      cancelled = true;
    };
  }, [proposition, retryToken]);

  return (
    <section className="verify-workspace">
      <div className="overclaim-notice" role="note">
        이 해시 검증은 저장된 증거 스냅샷의 무결성만 확인합니다. 출처 URL의 현재 본문이 수집 당시와 동일함을 보장하지 않습니다. 원문 동일성은 archiveUrl 또는 직접 대조로 확인하세요.
      </div>

      <div className="verify-grid">
        <section className="content-panel verifier-panel" aria-labelledby="span-title">
          <h2 id="span-title">HashVerifier</h2>
          {state.running ? <p>브라우저에서 spanHash를 계산하는 중입니다.</p> : null}
          {state.error ? (
            <div className="state-panel state-panel--error" role="alert">
              <p>{state.error}</p>
              <button type="button" onClick={() => setRetryToken((value) => value + 1)}>
                다시 계산
              </button>
            </div>
          ) : null}
          <div className="check-list">
            {state.spanChecks.map((check) => (
              <HashCheckRow check={check} key={check.label} snapshotText />
            ))}
          </div>
        </section>

        <section className="content-panel verifier-panel" aria-labelledby="version-title">
          <h2 id="version-title">VersionVerifier</h2>
          {state.running ? <p>propositionId, versionId, certHash를 계산하는 중입니다.</p> : null}
          <div className="check-list">
            {state.versionChecks.map((check) => (
              <HashCheckRow check={check} key={check.label} />
            ))}
          </div>
        </section>
      </div>

      <SourceOpener proposition={proposition} />
    </section>
  );
}

function HashCheckRow({ check, snapshotText = false }: { check: HashCheck; snapshotText?: boolean }) {
  return (
    <article className="hash-check">
      <div className="hash-check__header">
        <strong>{check.label}</strong>
        <ResultBadge check={check} snapshotText={snapshotText} />
      </div>
      <dl className="detail-list">
        <div>
          <dt>stored</dt>
          <dd className="mono breakable">{check.expected}</dd>
        </div>
        <div>
          <dt>computed</dt>
          <dd className="mono breakable">{check.actual}</dd>
        </div>
        {check.note ? (
          <div>
            <dt>note</dt>
            <dd>{check.note}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function ResultBadge({ check, snapshotText }: { check: HashCheck; snapshotText: boolean }) {
  const text = snapshotText
    ? snapshotResultText(check.status)
    : `${check.label} 재계산: ${statusLabel(check.status)}`;

  return <span className={`result-badge result-badge--${check.status}`}>{text}</span>;
}

function snapshotResultText(status: CheckStatus): string {
  switch (status) {
    case "match":
      return "저장된 증거 스냅샷 무결성: 일치";
    case "mismatch":
      return "저장된 증거 스냅샷 무결성: 불일치";
    case "unavailable":
      return "저장된 증거 스냅샷 무결성: 재계산 불가";
    default:
      return "저장된 증거 스냅샷 무결성: 대기";
  }
}

function statusLabel(status: CheckStatus): string {
  switch (status) {
    case "match":
      return "일치";
    case "mismatch":
      return "불일치";
    case "unavailable":
      return "재계산 불가";
    default:
      return "대기";
  }
}

function SourceOpener({ proposition }: { proposition: Proposition }) {
  const dashId = encodePropositionId(proposition.propositionId);

  return (
    <section className="content-panel source-opener" aria-labelledby="source-opener-title">
      <div className="section-heading">
        <p className="eyebrow">SourceOpener</p>
        <h2 id="source-opener-title">원문 직접 대조</h2>
      </div>
      <div className="source-list">
        {proposition.evidence.map((evidence, index) => (
          <article className="source-card" key={`${evidence.url}-${index}`}>
            <h3>
              E{index + 1}. {evidence.title}
            </h3>
            <div className="button-row">
              <a className="button-link" href={evidence.url} target="_blank" rel="noreferrer">
                현재 URL 열기
              </a>
              {evidence.archiveUrl ? (
                <a
                  className="button-link secondary"
                  href={evidence.archiveUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  archiveUrl 열기
                </a>
              ) : (
                <span className="warning-text">원문 보존본 없음, 원문 직접 확인 필요</span>
              )}
            </div>
          </article>
        ))}
      </div>
      <Link className="button-link secondary" href={`/p/${dashId}`}>
        상세 페이지로 돌아가기
      </Link>
    </section>
  );
}

