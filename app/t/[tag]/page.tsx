import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeBadge } from "../../components/GradeBadge";
import { claimNatureLabels, gradeLabel } from "../../../lib/display.ts";
import { loadPropositions } from "../../../lib/data.ts";
import { encodePropositionId } from "../../../lib/ids.ts";
import { sourceCount, tagRoute, uniqueTags } from "../../../lib/propositions.ts";
import { absoluteSiteUrl } from "../../../lib/site.ts";
import { loadSummaries, summaryFor } from "../../../lib/summaries.ts";
import { loadTopicArticles, topicArticleFor } from "../../../lib/topic-articles.ts";
import {
  eventDateKey,
  monthBucketLabel,
  topicPropositionPath,
  topicSummary
} from "../../../lib/topics.ts";
import type { Correction, Proposition } from "../../../lib/types.ts";

type PageProps = {
  params: Promise<{ tag: string }>;
};

const DISCLOSURE =
  "이 페이지는 태그가 같은 검증된 사실을 사건 발생 시점 순으로 자동 집계합니다. 서사·해석은 없으며 편집자가 배열하지 않습니다. 각 문장은 독립 검증된 명제이며 클릭하면 원문·출처로 이동합니다.";

export async function generateStaticParams() {
  const propositions = await loadPropositions();

  return uniqueTags(propositions).map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tag = decodeTag((await params).tag);

  return {
    title: `#${tag} | 진실저수지`,
    description: `#${tag} 태그의 검증된 사실을 사건 발생 시점 순으로 자동 집계한 주제 페이지`,
    alternates: {
      canonical: tagRoute(tag)
    }
  };
}

export default async function TagPage({ params }: PageProps) {
  const tag = decodeTag((await params).tag);
  const propositions = await loadPropositions();
  const tags = uniqueTags(propositions);

  if (!tags.includes(tag)) {
    notFound();
  }

  const summary = topicSummary(tag, propositions);
  const ordered = summary.orderedPropositions;
  const lastUpdated = ordered.reduce(
    (latest, proposition) =>
      proposition.updatedAt > latest ? proposition.updatedAt : latest,
    ""
  );
  const collectionJsonLd = buildCollectionJsonLd(tag, ordered);
  const fullText = buildTopicPlainText(tag, summary, ordered);
  const topicArticle = topicArticleFor(await loadTopicArticles(), tag, propositions);
  // 다사실 주제 기사가 없으면(단일 사실 주제 등) 그 명제의 개별 요약을 재사용한다.
  const fallbackSummary =
    !topicArticle && ordered.length === 1
      ? summaryFor(await loadSummaries(), ordered[0])
      : null;

  // Neutral month subheadings (제14): computed purely from the derived date. We walk
  // the already-ordered list and emit a heading only when the auto-derived "YYYY년 M월"
  // bucket changes. No thematic labels.
  let lastBucket: string | null = null;

  return (
    <main className="page topic-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdMarkup(collectionJsonLd)}
      />

      <header className="topic-page__header">
        <p className="eyebrow">태그 기반 자동 집계 주제</p>
        <h1>{tag}</h1>
        <p className="topic-page__meta">
          <span>사실 {summary.count}개</span>
          <span aria-hidden="true"> · </span>
          <span>{formatDateRange(summary.dateRange)}</span>
          <span aria-hidden="true"> · </span>
          <span>출처 합계 {summary.sourceTotal}</span>
          <span aria-hidden="true"> · </span>
          <span>
            <time dateTime={lastUpdated}>최종 수정 {lastUpdated}</time>
          </span>
        </p>
        <p className="topic-page__disclosure">{DISCLOSURE}</p>
        <div className="topic-page__actions">
          <button
            type="button"
            className="secondary topic-page__copy"
            data-copy-fulltext
            aria-live="polite"
          >
            전문 복사하기
          </button>
        </div>
      </header>

      <script
        id="topic-fulltext"
        type="application/json"
        dangerouslySetInnerHTML={jsonScriptMarkup(fullText)}
      />
      <script dangerouslySetInnerHTML={{ __html: copyFullTextScript() }} />

      {topicArticle ? (
        <section className="topic-article" aria-labelledby="topic-article-title">
          <p className="ai-summary__label" id="topic-article-title">
            AI 작성 기사
            <span className="ai-summary__disclaimer">
              아래 타임라인과 개별 검증 기록이 정본이며, 이 기사는 검증 대상이 아닙니다
            </span>
          </p>
          <div className="ai-summary topic-article__summary">
            <p className="ai-summary__text">{topicArticle.summary}</p>
          </div>
          <div className="topic-article__body">
            {topicArticle.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : fallbackSummary ? (
        <section className="ai-summary" aria-labelledby="topic-summary-title">
          <p className="ai-summary__label" id="topic-summary-title">
            AI 요약
            <span className="ai-summary__disclaimer">
              아래 검증 기록이 정본이며, 이 요약은 검증 대상이 아닙니다
            </span>
          </p>
          <p className="ai-summary__text">{fallbackSummary.summary}</p>
        </section>
      ) : null}

      <div className="topic-body">
        {ordered.map((proposition) => {
          const key = eventDateKey(proposition);
          const bucket = monthBucketLabel(key);
          const showBucket = bucket !== null && bucket !== lastBucket;
          if (bucket !== null) {
            lastBucket = bucket;
          }

          return (
            <div className="topic-fact-group" key={proposition.propositionId}>
              {showBucket ? (
                <h2 className="topic-month-heading">{bucket}</h2>
              ) : null}
              <FactBlock proposition={proposition} />
            </div>
          );
        })}
      </div>
    </main>
  );
}

function FactBlock({ proposition }: { proposition: Proposition }) {
  const dashId = encodePropositionId(proposition.propositionId);
  const whenText = proposition.sixW?.when?.trim();
  const whoText = proposition.sixW?.who?.trim();
  const sources = sourceCount(proposition);

  return (
    <article className="topic-fact" aria-label="검증된 사실">
      <p className="topic-fact__text">{proposition.canonicalProposition}</p>

      <p className="topic-fact__meta">
        <GradeBadge grade={proposition.assessment.factualGrade} />
        <span className="mini-badge">{claimNatureLabels[proposition.claimNature]}</span>
        {whoText ? <span className="topic-fact__who">{whoText}</span> : null}
        {whenText ? (
          <span className="topic-fact__when">{whenText}</span>
        ) : (
          <span className="topic-fact__when">
            <time dateTime={proposition.asOfDate}>{proposition.asOfDate}</time> 기준
          </span>
        )}
        <span className="topic-fact__sources">출처 {sources}</span>
        <Link className="topic-fact__link" href={`/p/${dashId}/`}>
          원문 →
        </Link>
      </p>

      {proposition.correctionHistory.length ? (
        <CorrectionInline corrections={proposition.correctionHistory} />
      ) : null}

      {proposition.undeterminedItems.length ? (
        <p className="topic-fact__undetermined">
          <span className="topic-fact__undetermined-label">판단유보</span>
          {proposition.undeterminedItems.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}

function CorrectionInline({ corrections }: { corrections: Correction[] }) {
  return (
    <ul className="topic-fact__corrections" aria-label="정정 이력">
      {corrections.map((correction) => (
        <li key={`${correction.date}:${correction.newVersionId}:${correction.before}`}>
          <span className="topic-fact__corrections-label">정정</span>
          <span>{correction.before}</span>
          <span aria-hidden="true"> → </span>
          <span>{correction.after}</span>
        </li>
      ))}
    </ul>
  );
}

function formatDateRange({ from, to }: { from: string | null; to: string | null }): string {
  if (!from || !to) {
    return "날짜범위 불명";
  }
  if (from === to) {
    return `날짜 ${from}`;
  }

  return `날짜범위 ${from}~${to}`;
}

// CollectionPage JSON-LD (제15/제2-safe): the collection lists its member pages in the
// deterministic order. hasPart holds absolute /p/{dashId}/ URLs. It asserts NOTHING
// about the topic itself — no verdict, no summary, no ClaimReview.
function buildCollectionJsonLd(tag: string, ordered: Proposition[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `#${tag}`,
    url: absoluteSiteUrl(tagRoute(tag)),
    inLanguage: "ko",
    isPartOf: {
      "@type": "WebSite",
      name: "진실저수지",
      url: absoluteSiteUrl("/")
    },
    hasPart: ordered.map((proposition) => ({
      "@type": "WebPage",
      url: absoluteSiteUrl(topicPropositionPath(proposition))
    }))
  };
}

function jsonLdMarkup(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

function jsonScriptMarkup(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

// Deterministic (제14) plain-text rendering of the woven topic article, in the exact
// event-date order shown on the page. Carries the disclosure so the "no editorial
// arrangement" context travels with any copied/pasted text. Asserts no verdict about
// the topic — it is a faithful text mirror of the rendered facts.
function buildTopicPlainText(
  tag: string,
  summary: ReturnType<typeof topicSummary>,
  ordered: Proposition[]
): string {
  const lines: string[] = [];

  lines.push(tag);
  lines.push(
    `사실 ${summary.count}개 · ${formatDateRange(summary.dateRange)} · 출처 합계 ${summary.sourceTotal}`
  );
  lines.push(`출처: ${absoluteSiteUrl(tagRoute(tag))}`);
  lines.push("");
  lines.push(DISCLOSURE);
  lines.push("");

  let lastBucket: string | null = null;

  for (const proposition of ordered) {
    const bucket = monthBucketLabel(eventDateKey(proposition));
    if (bucket !== null && bucket !== lastBucket) {
      lastBucket = bucket;
      lines.push(`## ${bucket}`);
      lines.push("");
    }

    lines.push(proposition.canonicalProposition);

    const whoText = proposition.sixW?.who?.trim();
    const whenText = proposition.sixW?.when?.trim();
    const metaParts: string[] = [];
    if (whoText) {
      metaParts.push(whoText);
    }
    metaParts.push(whenText ? whenText : `${proposition.asOfDate} 기준`);
    metaParts.push(gradeLabel(proposition.assessment.factualGrade));
    metaParts.push(claimNatureLabels[proposition.claimNature]);
    metaParts.push(`출처 ${sourceCount(proposition)}`);
    lines.push(`· ${metaParts.join(" · ")}`);
    lines.push(`원문: ${absoluteSiteUrl(`/p/${encodePropositionId(proposition.propositionId)}/`)}`);

    for (const correction of proposition.correctionHistory) {
      lines.push(`정정: ${correction.before} → ${correction.after}`);
    }
    if (proposition.undeterminedItems.length) {
      lines.push(`판단유보: ${proposition.undeterminedItems.join(" · ")}`);
    }

    lines.push("");
  }

  lines.push("— 진실저수지(Truth Reservoir) · 판정하지 않는 검증 사실 저장소");

  return `${lines.join("\n").trim()}\n`;
}

// Inline client script: copies the full-text island to the clipboard with a graceful
// fallback for non-secure contexts, and flashes button feedback.
function copyFullTextScript(): string {
  return `
(() => {
  const button = document.querySelector("[data-copy-fulltext]");
  const island = document.getElementById("topic-fulltext");
  if (!button || !island) {
    return;
  }

  let text = "";
  try {
    text = JSON.parse(island.textContent || '""');
  } catch (error) {
    console.error(error);
    return;
  }

  const defaultLabel = button.textContent;
  let resetTimer = null;

  const flash = (message) => {
    button.textContent = message;
    if (resetTimer) {
      window.clearTimeout(resetTimer);
    }
    resetTimer = window.setTimeout(() => {
      button.textContent = defaultLabel;
    }, 2000);
  };

  const fallbackCopy = () => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  };

  button.addEventListener("click", async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        flash("복사됨");
        return;
      }
    } catch (error) {
      // fall through to the execCommand fallback below
    }
    flash(fallbackCopy() ? "복사됨" : "복사 실패");
  });
})();
`;
}

function decodeTag(tag: string): string {
  try {
    return decodeURIComponent(tag);
  } catch {
    return tag;
  }
}
