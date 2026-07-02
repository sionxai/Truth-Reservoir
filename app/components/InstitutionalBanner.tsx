import type { InstitutionalMetrics } from "../../lib/types.ts";

interface InstitutionalBannerProps {
  metrics: InstitutionalMetrics;
}

export function InstitutionalBanner({ metrics }: InstitutionalBannerProps) {
  const unestablished = metrics.status === "unestablished";
  const cm = metrics.correctionMetrics;

  return (
    <section
      className={`institutional-strip ${unestablished ? "institutional-strip--warning" : ""}`}
      aria-labelledby="institutional-metrics-title"
    >
      <div className="section-heading">
        <p className="eyebrow">기관 메트릭</p>
        <h2 id="institutional-metrics-title">
          {unestablished ? "기관 신뢰도 미확립" : "기관 신뢰도 메트릭"}
        </h2>
        <p>
          제11조 투명성 요구에 따라 누적 등재, 판단유보, 측정 오류율, 정정 요청 상태를
          공개합니다.
        </p>
      </div>

      <dl className="metric-strip-grid">
        <Metric label="누적 등재" value={`${metrics.totalEntries}건`} />
        <Metric label="라벨 산정" value={`${metrics.totalAssessed}건`} />
        <Metric label="판단유보" value={`${metrics.totalUndetermined}건`} />
        <Metric label="측정 오류율" value={formatMeasuredErrorRate(metrics)} />
      </dl>

      <p className={cm.staleCorrectionRequests > 0 ? "metric-warning" : "metric-note"}>
        정정 요청: 열림 {cm.openCorrectionRequests}건 · 방치 기준 {cm.staleThresholdDays}일 초과{" "}
        {cm.staleCorrectionRequests}건 · 수용 {cm.acceptedCorrections}건 · 기각{" "}
        {cm.rejectedCorrections}건. 처리 소요 중앙값은{" "}
        {cm.latencyStatus === "measured"
          ? `${cm.medianCorrectionLatencyDays}일`
          : "아직 표본 없음"}입니다.
      </p>
      <a className="inline-resource-link" href="/api/v2/institutional-metrics.json">
        기관 메트릭 JSON
      </a>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatMeasuredErrorRate(metrics: InstitutionalMetrics): string {
  const rate = metrics.measuredErrorRate;

  if (rate.status !== "measured" || rate.value === null) {
    return "미측정";
  }

  return `${(rate.value * 100).toLocaleString("ko-KR", {
    maximumFractionDigits: 2
  })}%`;
}
