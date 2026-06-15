import type { Correction } from "../../lib/types.ts";

interface CorrectionTimelineProps {
  corrections: Correction[];
}

export function CorrectionTimeline({ corrections }: CorrectionTimelineProps) {
  return (
    <section className="content-panel correction-timeline" aria-labelledby="correction-title">
      <h2 id="correction-title">정정 이력</h2>
      {corrections.length ? (
        <ol>
          {corrections.map((correction) => (
            <li key={`${correction.date}-${correction.newVersionId}`}>
              <time>{correction.date}</time>
              <strong>{correction.error}</strong>
              <p>{correction.before}</p>
              <p>{correction.after}</p>
              <p className="mono">{correction.newVersionId}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p>정정 이력 없음</p>
      )}
    </section>
  );
}

