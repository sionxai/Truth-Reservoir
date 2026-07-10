import type { Grade } from "../../lib/types.ts";
import { gradeLabel } from "../../lib/display.ts";

interface GradeBadgeProps {
  grade: Grade | null;
  prefix?: string;
}

export function GradeBadge({ grade, prefix }: GradeBadgeProps) {
  return (
    <span className="grade-badge" data-grade={grade ?? "undetermined"}>
      {prefix ? <span className="grade-badge__prefix">{prefix}</span> : null}
      <span>구체계 기록: {gradeLabel(grade)}</span>
    </span>
  );
}
