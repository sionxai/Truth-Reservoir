import { assessmentStatusLabels } from "../../lib/display.ts";
import type { Proposition } from "../../lib/types.ts";
import { GradeBadge } from "./GradeBadge";

interface GradePanelProps {
  proposition: Proposition;
}

export function GradePanel({ proposition }: GradePanelProps) {
  const { assessment } = proposition;
  const undetermined = assessment.status === "undetermined";

  return (
    <section className="content-panel grade-panel" aria-labelledby="grade-panel-title">
      <div className="section-heading">
        <p className="eyebrow">Secondary Signal</p>
        <h2 id="grade-panel-title">사실 신뢰도 보조 라벨</h2>
      </div>

      {undetermined ? (
        <div className="undetermined-box">
          <strong>{assessmentStatusLabels.undetermined}</strong>
          <p>
            이 상태는 “애매(mixed)” 등급과 다릅니다. 증거 또는 절차가 부족해 현 시점 기준 라벨을 산정하지 않은 경우입니다.
          </p>
          <ul>
            {proposition.undeterminedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grade-axis-grid">
        <div className="grade-axis">
          <span>사실 신뢰도</span>
          <GradeBadge grade={assessment.factualGrade} />
        </div>
      </div>

      <div className="rationale-block">
        <h3>gradeRationale</h3>
        <p>{assessment.gradeRationale}</p>
      </div>
    </section>
  );
}
