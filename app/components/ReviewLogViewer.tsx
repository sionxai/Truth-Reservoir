import ReactMarkdown from "react-markdown";
import type { ReviewLog } from "../../lib/types.ts";

interface ReviewLogViewerProps {
  reviewLog: ReviewLog;
}

export function ReviewLogViewer({ reviewLog }: ReviewLogViewerProps) {
  return (
    <details className="content-panel review-log">
      <summary>반론 검토 로그</summary>
      <div className="review-grid">
        <section>
          <h3>Redteam</h3>
          <dl className="detail-list">
            <div>
              <dt>strongestCounterargument</dt>
              <dd>{reviewLog.redteam.strongestCounterargument}</dd>
            </div>
            <div>
              <dt>response</dt>
              <dd>{reviewLog.redteam.response}</dd>
            </div>
            <div>
              <dt>errorsFound</dt>
              <dd>{reviewLog.redteam.errorsFound}</dd>
            </div>
            <div>
              <dt>framingChecks</dt>
              <dd>{reviewLog.redteam.framingChecks}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>Symmetry</h3>
          <dl className="detail-list">
            <div>
              <dt>checked</dt>
              <dd>{reviewLog.symmetry.checked ? "점검함" : "점검 안 함"}</dd>
            </div>
            <div>
              <dt>method</dt>
              <dd>{reviewLog.symmetry.method}</dd>
            </div>
            {reviewLog.symmetry.pairedPropositionId ? (
              <div>
                <dt>pairedPropositionId</dt>
                <dd className="mono">{reviewLog.symmetry.pairedPropositionId}</dd>
              </div>
            ) : null}
            <div>
              <dt>result</dt>
              <dd>{reviewLog.symmetry.result}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>권위 가정 점검</h3>
          <dl className="detail-list">
            <div>
              <dt>checked</dt>
              <dd>{reviewLog.authorityCheck.checked ? "점검함" : "점검 안 함"}</dd>
            </div>
            <div>
              <dt>note</dt>
              <dd>{reviewLog.authorityCheck.note}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>Human Review</h3>
          <dl className="detail-list">
            <div>
              <dt>reviewer</dt>
              <dd>{reviewLog.humanReview.reviewer}</dd>
            </div>
            <div>
              <dt>date</dt>
              <dd>{reviewLog.humanReview.date}</dd>
            </div>
            <div>
              <dt>checksPerformed</dt>
              <dd>{reviewLog.humanReview.checksPerformed.join(", ")}</dd>
            </div>
            <div>
              <dt>adoptedReason</dt>
              <dd>{reviewLog.humanReview.adoptedReason}</dd>
            </div>
            <div>
              <dt>rejectedAlternatives</dt>
              <dd>{reviewLog.humanReview.rejectedAlternatives}</dd>
            </div>
          </dl>
          <div className="markdown-block">
            <h4>reviewMemo</h4>
            <ReactMarkdown>{reviewLog.humanReview.reviewMemo}</ReactMarkdown>
          </div>
        </section>
      </div>
    </details>
  );
}

