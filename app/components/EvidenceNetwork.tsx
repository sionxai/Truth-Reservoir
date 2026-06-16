import {
  claimNatureLabels,
  classificationLabels,
  formatDateTime
} from "../../lib/display.ts";
import type { EvidenceItem, Proposition } from "../../lib/types.ts";

interface EvidenceNetworkProps {
  proposition: Proposition;
}

export function EvidenceNetwork({ proposition }: EvidenceNetworkProps) {
  const groups = groupEvidenceByIndependence(proposition.evidence);

  return (
    <section className="evidence-network" aria-labelledby="evidence-network-title">
      <header className="evidence-network__header">
        <p className="eyebrow">Primary Artifact / Evidence Network</p>
        <h1 id="evidence-network-title">{proposition.canonicalProposition}</h1>
        <div className="meta-row evidence-network__meta">
          <span>현 시점 기준 {proposition.asOfDate}</span>
          <span>증거 스냅샷 기준</span>
          <span>{classificationLabels[proposition.classification]}</span>
          <span>{claimNatureLabels[proposition.claimNature]}</span>
          <span className="mono">{proposition.propositionId}</span>
        </div>
      </header>

      {proposition.measurement ? (
        <section className="measurement-methodology" aria-labelledby="measurement-methodology-title">
          <p className="eyebrow">Measurement Methodology</p>
          <h2 id="measurement-methodology-title">측정 방법론</h2>
          <dl className="detail-list">
            <div>
              <dt>method</dt>
              <dd>{proposition.measurement.method}</dd>
            </div>
            <div>
              <dt>sample</dt>
              <dd>{proposition.measurement.sample}</dd>
            </div>
            <div>
              <dt>aggregationBasis</dt>
              <dd>{proposition.measurement.aggregationBasis}</dd>
            </div>
            <div>
              <dt>producer</dt>
              <dd>{proposition.measurement.producer}</dd>
            </div>
            {proposition.measurement.measuredAt ? (
              <div>
                <dt>measuredAt</dt>
                <dd>{formatDateTime(proposition.measurement.measuredAt)}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <div className="evidence-groups">
        {groups.map((group) => (
          <section className="evidence-group" key={group.independenceGroupId}>
            <div className="evidence-group__header">
              <div>
                <p className="eyebrow">independenceGroupId</p>
                <h2 className="mono">{group.independenceGroupId}</h2>
              </div>
              <span>{group.items.length}개 증거 항목</span>
            </div>
            <div className="evidence-items">
              {group.items.map((evidence, index) => (
                <EvidenceCard evidence={evidence} index={index} key={`${evidence.url}-${index}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function EvidenceCard({ evidence, index }: { evidence: EvidenceItem; index: number }) {
  return (
    <article className="evidence-card">
      <div className="evidence-card__title">
        <span className="evidence-index">E{index + 1}</span>
        <div>
          <h3>
            <a href={evidence.url} target="_blank" rel="noreferrer">
              {evidence.title}
            </a>
          </h3>
          <p>수집 시각 {formatDateTime(evidence.retrievedAt)}</p>
        </div>
      </div>

      {evidence.shortQuote ? (
        <blockquote className="short-quote">“{evidence.shortQuote}”</blockquote>
      ) : null}

      <dl className="evidence-details">
        <div>
          <dt>URL</dt>
          <dd>
            <a href={evidence.url} target="_blank" rel="noreferrer">
              {evidence.url}
            </a>
          </dd>
        </div>
        <div>
          <dt>evidenceSpans</dt>
          <dd>
            {evidence.evidenceSpans.map((span) => (
              <span className="mono" key={`${span.start}-${span.end}`}>
                {span.start}-{span.end}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>spanHash</dt>
          <dd className="mono breakable">{evidence.spanHash}</dd>
        </div>
        <div>
          <dt>archiveUrl</dt>
          <dd>
            {evidence.archiveUrl ? (
              <a href={evidence.archiveUrl} target="_blank" rel="noreferrer">
                {evidence.archiveUrl}
              </a>
            ) : (
              <span className="warning-text">원문 보존본 없음</span>
            )}
          </dd>
        </div>
        <div>
          <dt>independenceLevel</dt>
          <dd>{evidence.independenceLevel}</dd>
        </div>
        <div>
          <dt>independenceNote</dt>
          <dd>{evidence.independenceNote}</dd>
        </div>
        <div>
          <dt>sourceCompetence</dt>
          <dd>{evidence.sourceCompetence}</dd>
        </div>
        <div>
          <dt>competenceNote</dt>
          <dd>{evidence.competenceNote}</dd>
        </div>
        <div>
          <dt>sourceType</dt>
          <dd>{evidence.sourceType}</dd>
        </div>
        <div>
          <dt>retrievalLimitations</dt>
          <dd>{evidence.retrievalLimitations}</dd>
        </div>
        <div>
          <dt>sourceProvenance.productionIndependence</dt>
          <dd>{evidence.sourceProvenance.productionIndependence}</dd>
        </div>
        <div>
          <dt>sourceProvenance.productionConcerns</dt>
          <dd>
            {evidence.sourceProvenance.productionConcerns.length
              ? evidence.sourceProvenance.productionConcerns.join(", ")
              : "기록된 생산 우려 없음"}
          </dd>
        </div>
        <div>
          <dt>sourceProvenance.requiresMethodologyAudit</dt>
          <dd>{evidence.sourceProvenance.requiresMethodologyAudit ? "필요" : "불필요"}</dd>
        </div>
      </dl>
    </article>
  );
}

function groupEvidenceByIndependence(evidence: EvidenceItem[]) {
  const groupMap = new Map<string, EvidenceItem[]>();

  for (const item of evidence) {
    const items = groupMap.get(item.independenceGroupId) ?? [];
    items.push(item);
    groupMap.set(item.independenceGroupId, items);
  }

  return [...groupMap.entries()].map(([independenceGroupId, items]) => ({
    independenceGroupId,
    items
  }));
}
