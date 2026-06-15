import type { InstitutionalMetrics } from "../../lib/types.ts";

interface InstitutionalBannerProps {
  metrics: InstitutionalMetrics;
}

export function InstitutionalBanner({ metrics }: InstitutionalBannerProps) {
  const unestablished = metrics.status === "unestablished";

  return (
    <section className={`institutional-banner ${unestablished ? "notice--warning" : ""}`}>
      <div>
        <p className="eyebrow">기관 메트릭</p>
        <h2>{unestablished ? "기관 신뢰도 미확립" : "기관 신뢰도 메트릭 공개"}</h2>
      </div>
      <p>
        누적 공개 명제 {metrics.totalPropositionsVerified}건. 오류율은{" "}
        {metrics.measuredErrorRate.status === "measured"
          ? `${metrics.measuredErrorRate.value} ${metrics.measuredErrorRate.unit}`
          : "표본 부족으로 미측정"}
        입니다.
      </p>
    </section>
  );
}

