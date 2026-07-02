import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeBadge } from "../../components/GradeBadge";
import {
  claimNatureLabels,
  formatDateTime,
  reviewModeLabels,
  sourceHostname
} from "../../../lib/display.ts";
import { loadPropositions } from "../../../lib/data.ts";
import {
  entityRegistry,
  entitiesForProposition,
  entityForRawValue,
  linkEntityNamesInText,
  roleLabel,
  type EntityRegistryEntry,
  type EntityRole,
  type EntityTextSegment,
  type PropositionEntity
} from "../../../lib/entities.ts";
import { decodePropositionId, encodePropositionId } from "../../../lib/ids.ts";
import { relatedPropositions, type RelatedProposition } from "../../../lib/relations.ts";
import { absoluteSiteUrl, getRepoUrl } from "../../../lib/site.ts";
import type { Correction, EvidenceItem, Proposition } from "../../../lib/types.ts";

type PageProps = {
  params: Promise<{ propositionId: string }>;
};

export async function generateStaticParams() {
  const propositions = await loadPropositions();

  return propositions.map((proposition) => ({
    propositionId: encodePropositionId(proposition.propositionId)
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { propositionId } = await params;
  const proposition = await findProposition(propositionId);
  const dashId = propositionId;

  if (!proposition) {
    return {
      title: "FACTS 기사 | 진실저수지"
    };
  }

  const canonicalPath = `/p/${dashId}`;
  const jsonPath = propositionJsonPath(dashId);

  return {
    title: `${proposition.canonicalProposition} | 진실저수지`,
    description: proposition.canonicalProposition,
    alternates: {
      canonical: canonicalPath,
      types: {
        "application/json": jsonPath
      }
    },
    openGraph: {
      title: proposition.canonicalProposition,
      description: proposition.canonicalProposition,
      type: "article",
      url: canonicalPath,
      publishedTime: proposition.createdAt,
      modifiedTime: proposition.updatedAt
    }
  };
}

export default async function PropositionDetailPage({ params }: PageProps) {
  const { propositionId } = await params;
  const propositions = await loadPropositions();
  const proposition = findPropositionInList(propositionId, propositions);

  if (!proposition) {
    notFound();
  }

  const dashId = encodePropositionId(proposition.propositionId);
  const jsonPath = propositionJsonPath(dashId);
  const jsonUrl = absoluteSiteUrl(jsonPath);
  const registry = entityRegistry(propositions);
  const propositionEntities = entitiesForProposition(proposition, registry);
  const canonicalSegments = linkEntityNamesInText(proposition.canonicalProposition, registry);
  const related = relatedPropositions(proposition, propositions);
  const relatedLinks = related.map((item) =>
    absoluteSiteUrl(`/p/${encodePropositionId(item.proposition.propositionId)}/`)
  );
  const articleJsonLd = buildArticleJsonLd(proposition, dashId, jsonUrl, relatedLinks);
  const issueUrl = buildCorrectionIssueUrl(getRepoUrl(), proposition);
  const whyItems =
    proposition.sixW?.why.filter((item) => item.statedBy.trim() && item.reason.trim()) ?? [];

  return (
    <main className="detail-page facts-detail-page">
      <article className="facts-article">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdMarkup(articleJsonLd)}
        />

        <header className="facts-article__header">
          <div className="badge-row" aria-label="명제 상태">
            <GradeBadge grade={proposition.assessment.factualGrade} />
            <span className="mini-badge">{claimNatureLabels[proposition.claimNature]}</span>
            <span className="mini-badge">{reviewModeLabels[proposition.reviewMode]}</span>
            {proposition.sensitive.sensitive ? <span className="mini-badge">민감</span> : null}
            {proposition.openCorrectionRequests > 0 ? (
              <span className="mini-badge mini-badge--warning">
                이의제기 중 {proposition.openCorrectionRequests}건
              </span>
            ) : null}
            <span className="mini-badge">
              <time dateTime={proposition.asOfDate}>{proposition.asOfDate}</time> 기준
            </span>
          </div>
          <h1>{renderEntityTextSegments(canonicalSegments)}</h1>
        </header>

        <RelatedEntitiesRow entities={propositionEntities} />

        {proposition.sixW ? (
          <section className="facts-section" aria-labelledby="sixw-title">
            <h2 id="sixw-title">육하원칙</h2>
            <dl className="facts-dl sixw-dl">
              <div>
                <dt>누가</dt>
                <dd>
                  <StructuredEntityLink
                    raw={proposition.sixW.who}
                    registry={registry}
                    role="who"
                  />
                </dd>
              </div>
              <div>
                <dt>언제</dt>
                <dd>{proposition.sixW.when}</dd>
              </div>
              <div>
                <dt>어디서</dt>
                <dd>{proposition.sixW.where}</dd>
              </div>
              <div>
                <dt>무엇을</dt>
                <dd>{proposition.sixW.what}</dd>
              </div>
              <div>
                <dt>어떻게</dt>
                <dd>{proposition.sixW.how}</dd>
              </div>
              {whyItems.length ? (
                <div>
                  <dt>왜</dt>
                  <dd>
                    <ul className="why-list">
                      {whyItems.map((item) => (
                        <li key={`${item.statedBy}:${item.reason}`}>
                          <AttributionEntityBadge
                            registry={registry}
                            statedBy={item.statedBy}
                          />
                          <span>{item.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="facts-section" aria-labelledby="corrections-title">
          <h2 id="corrections-title">집계·정정 이력</h2>
          <CorrectionTable corrections={proposition.correctionHistory} />
        </section>

        {proposition.measurement ? (
          <section className="facts-section facts-section--small" aria-labelledby="measurement-title">
            <h2 id="measurement-title">측정 정보</h2>
            <dl className="facts-dl compact-dl">
              <div>
                <dt>method</dt>
                <dd>{proposition.measurement.method}</dd>
              </div>
              <div>
                <dt>producer</dt>
                <dd>{proposition.measurement.producer}</dd>
              </div>
              {proposition.measurement.measuredAt ? (
                <div>
                  <dt>measuredAt</dt>
                  <dd>
                    <time dateTime={proposition.measurement.measuredAt}>
                      {proposition.measurement.measuredAt}
                    </time>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {proposition.undeterminedItems.length ? (
          <section className="facts-section notice-box" aria-labelledby="undetermined-title">
            <h2 id="undetermined-title">판단유보</h2>
            <ul>
              {proposition.undeterminedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {proposition.sensitive.sensitive && proposition.sensitive.presumptionNotice ? (
          <section className="facts-section notice-box" aria-labelledby="sensitive-title">
            <h2 id="sensitive-title">민감 사안 고지</h2>
            <p>{proposition.sensitive.presumptionNotice}</p>
          </section>
        ) : null}

        <section className="facts-section" aria-labelledby="evidence-title">
          <h2 id="evidence-title">증거</h2>
          <ol className="evidence-list">
            {proposition.evidence.map((evidence, index) => (
              <EvidenceListItem evidence={evidence} index={index} key={`${evidence.url}:${index}`} />
            ))}
          </ol>
        </section>

        <section className="facts-section" aria-labelledby="limitations-title">
          <h2 id="limitations-title">한계</h2>
          <p>{proposition.limitations}</p>
        </section>

        <footer className="facts-footer" aria-label="기계 판독 및 검증 링크">
          <dl className="facts-id-grid">
            <div>
              <dt>propositionId</dt>
              <dd>
                <code className="mono breakable">{proposition.propositionId}</code>
              </dd>
            </div>
            <div>
              <dt>versionId</dt>
              <dd>
                <code className="mono breakable">{proposition.versionId}</code>
              </dd>
            </div>
            <div>
              <dt>certHash</dt>
              <dd>
                <code className="mono breakable">{proposition.certHash}</code>
              </dd>
            </div>
          </dl>

          <nav className="facts-footer__links" aria-label="원본과 검증">
            <a href={jsonPath}>이 사건의 JSON 원본</a>
            <Link href={`/verify/${dashId}`}>검증 페이지</Link>
            <a href={issueUrl} target="_blank" rel="noopener">
              GitHub Issue 열기
            </a>
          </nav>
        </footer>

        <RelatedFactsSection related={related} />
      </article>
    </main>
  );
}

function renderEntityTextSegments(segments: EntityTextSegment[]) {
  return segments.map((segment, index) => {
    if (!segment.entity) {
      return <span key={`${segment.text}:${index}`}>{segment.text}</span>;
    }

    return (
      <Link
        className="entity-inline-link"
        href={segment.entity.path}
        key={`${segment.text}:${index}`}
      >
        {segment.text}
      </Link>
    );
  });
}

function RelatedEntitiesRow({ entities }: { entities: PropositionEntity[] }) {
  if (!entities.length) {
    return null;
  }

  return (
    <nav className="related-entity-row" aria-label="관련 엔티티">
      <span className="related-entity-row__label">관련 엔티티</span>
      <ul>
        {entities.map((entity) => (
          <li key={entity.name}>
            <Link href={entity.path}>
              {entity.name}
              <span>{entity.roles.map(roleLabel).join(" · ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function StructuredEntityLink({
  raw,
  role,
  registry
}: {
  raw: string;
  role: EntityRole;
  registry: Map<string, EntityRegistryEntry>;
}) {
  const entity = entityForRawValue(raw, role, registry);

  if (!entity) {
    return raw;
  }

  return (
    <Link className="entity-field-link" href={entity.path}>
      {raw}
    </Link>
  );
}

function AttributionEntityBadge({
  statedBy,
  registry
}: {
  statedBy: string;
  registry: Map<string, EntityRegistryEntry>;
}) {
  const entity = entityForRawValue(statedBy, "statedBy", registry);
  const label = `${statedBy}가 밝힌 사유`;

  if (!entity) {
    return <span className="attribution-badge">{label}</span>;
  }

  return (
    <Link className="attribution-badge attribution-badge--link" href={entity.path}>
      {label}
    </Link>
  );
}

function RelatedFactsSection({ related }: { related: RelatedProposition[] }) {
  if (!related.length) {
    return null;
  }

  return (
    <section className="facts-section related-facts" aria-labelledby="related-facts-title">
      <div>
        <h2 id="related-facts-title">관련 FACTS</h2>
        <p className="relation-note">
          태그 교집합으로 자동 선정됩니다 — 편집자가 고르지 않습니다
        </p>
      </div>
      <ul className="related-facts-list">
        {related.map((item) => {
          const relatedDashId = encodePropositionId(item.proposition.propositionId);

          return (
            <li key={item.proposition.propositionId}>
              <a className="related-facts-card" href={`/p/${relatedDashId}/`}>
                <span className="related-facts-card__top">
                  <GradeBadge grade={item.proposition.assessment.factualGrade} />
                  <span className="mini-badge">
                    <time dateTime={item.proposition.asOfDate}>{item.proposition.asOfDate}</time>{" "}
                    기준
                  </span>
                </span>
                <span className="related-facts-card__title" title={item.proposition.canonicalProposition}>
                  {item.proposition.canonicalProposition}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CorrectionTable({ corrections }: { corrections: Correction[] }) {
  return (
    <table className="correction-table">
      <thead>
        <tr>
          <th scope="col">날짜</th>
          <th scope="col">before → after</th>
          <th scope="col">detectedBy</th>
        </tr>
      </thead>
      <tbody>
        {corrections.length ? (
          corrections.map((correction) => (
            <tr key={`${correction.date}:${correction.newVersionId}:${correction.before}`}>
              <td>
                <time dateTime={correction.date}>{correction.date}</time>
              </td>
              <td>
                <span className="correction-table__error">{correction.error}</span>
                <span>{correction.before}</span>
                <span aria-hidden="true"> → </span>
                <span>{correction.after}</span>
              </td>
              <td>{correction.detectedBy}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3}>기록된 집계·정정 이력 없음</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function EvidenceListItem({ evidence, index }: { evidence: EvidenceItem; index: number }) {
  const quoteHashPrefix = evidence.quoteHash.slice(0, 24);

  return (
    <li className="evidence-list__item">
      <article>
        <div className="evidence-list__header">
          <span className="evidence-index">E{index + 1}</span>
          <div>
            <h3>
              <a href={evidence.url} target="_blank" rel="noopener">
                {evidence.title}
              </a>
            </h3>
            <p>
              <span>{sourceHostname(evidence.url)}</span>
              <span aria-hidden="true"> · </span>
              <time dateTime={evidence.retrievedAt}>{formatDateTime(evidence.retrievedAt)}</time>
            </p>
          </div>
        </div>
        <blockquote>
          <p>{evidence.shortQuote}</p>
        </blockquote>
        <div className="evidence-list__tags">
          <span className="mini-badge">{evidence.independenceLevel}</span>
          <span className="mini-badge">{evidence.sourceType}</span>
          <small className="mono" title={evidence.quoteHash}>
            {quoteHashPrefix}
          </small>
        </div>
      </article>
    </li>
  );
}

async function findProposition(dashId: string): Promise<Proposition | null> {
  const propositions = await loadPropositions();

  return findPropositionInList(dashId, propositions);
}

function findPropositionInList(dashId: string, propositions: Proposition[]): Proposition | null {
  const decodedId = decodePropositionId(dashId);

  return propositions.find((item) => item.propositionId === decodedId) ?? null;
}

function propositionJsonPath(dashId: string): string {
  return `/api/v2/propositions/${dashId}.json`;
}

function buildArticleJsonLd(
  proposition: Proposition,
  dashId: string,
  jsonUrl: string,
  relatedLinks: string[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: proposition.canonicalProposition,
    datePublished: proposition.createdAt,
    dateModified: proposition.updatedAt,
    inLanguage: proposition.language,
    identifier: proposition.propositionId,
    citation: proposition.evidence.map((evidence) => evidence.url),
    isBasedOn: jsonUrl,
    mainEntityOfPage: absoluteSiteUrl(`/p/${dashId}`),
    relatedLink: relatedLinks,
    publisher: {
      "@type": "Organization",
      name: "진실저수지"
    }
  };
}

function jsonLdMarkup(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
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
