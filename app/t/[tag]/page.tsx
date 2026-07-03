import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeBadge } from "../../components/GradeBadge";
import { claimNatureLabels } from "../../../lib/display.ts";
import { loadPropositions } from "../../../lib/data.ts";
import { encodePropositionId } from "../../../lib/ids.ts";
import { sourceCount, tagRoute, uniqueTags } from "../../../lib/propositions.ts";
import { absoluteSiteUrl } from "../../../lib/site.ts";
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
  const collectionJsonLd = buildCollectionJsonLd(tag, ordered);

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
        </p>
        <p className="topic-page__disclosure">{DISCLOSURE}</p>
      </header>

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

function decodeTag(tag: string): string {
  try {
    return decodeURIComponent(tag);
  } catch {
    return tag;
  }
}
