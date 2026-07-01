import Link from "next/link";
import { claimNatureLabels } from "../../lib/display.ts";
import { encodePropositionId } from "../../lib/ids.ts";
import { sourceCount, tagRoute } from "../../lib/propositions.ts";
import type { Proposition } from "../../lib/types.ts";
import { GradeBadge } from "./GradeBadge";

interface PropositionCardProps {
  proposition: Proposition;
}

export function PropositionCard({ proposition }: PropositionCardProps) {
  const dashId = encodePropositionId(proposition.propositionId);
  const tags = proposition.tags.slice(0, 3);

  return (
    <article className="facts-card">
      <div className="facts-card__badges">
        <GradeBadge grade={proposition.assessment.factualGrade} />
        <span className="mini-badge">{claimNatureLabels[proposition.claimNature]}</span>
      </div>

      <h2>
        <Link href={`/p/${dashId}`}>{proposition.canonicalProposition}</Link>
      </h2>

      <dl className="facts-card__meta" aria-label="명제 요약 정보">
        <div>
          <dt>기준일</dt>
          <dd>
            <time dateTime={proposition.asOfDate}>{proposition.asOfDate}</time>
          </dd>
        </div>
        <div>
          <dt>출처 수</dt>
          <dd>{sourceCount(proposition)}개</dd>
        </div>
      </dl>

      {tags.length ? (
        <ul className="tag-list" aria-label="태그">
          {tags.map((tag) => (
            <li key={tag}>
              <Link href={tagRoute(tag)}>{tag}</Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
