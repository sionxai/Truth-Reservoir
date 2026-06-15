import type { Grade } from "../../lib/types.ts";
import { gradeLabel, gradeTone } from "../../lib/display.ts";

interface GradeBadgeProps {
  grade: Grade | null;
  prefix?: string;
}

export function GradeBadge({ grade, prefix }: GradeBadgeProps) {
  const tone = gradeTone(grade);

  return (
    <span className={`grade-badge grade-badge--${tone}`}>
      {prefix ? <span className="grade-badge__prefix">{prefix}</span> : null}
      <span>{gradeLabel(grade)}</span>
      {grade ? <span className="grade-badge__code">{grade}</span> : null}
    </span>
  );
}

