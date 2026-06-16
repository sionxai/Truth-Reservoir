import type { InstitutionalMetrics } from "../../lib/types.ts";

interface InstitutionalBannerProps {
  metrics: InstitutionalMetrics;
}

export function InstitutionalBanner({ metrics }: InstitutionalBannerProps) {
  const unestablished = metrics.status === "unestablished";
  const cm = metrics.correctionMetrics;

  return (
    <section className={`institutional-banner ${unestablished ? "notice--warning" : ""}`}>
      <div>
        <p className="eyebrow">기관 메트릭</p>
        <h2>{unestablished ? "기관 신뢰도 미확립" : "기관 신뢰도 메트릭 공개"}</h2>
      </div>
      <p>
        누적 등재 {metrics.totalEntries}건 (검증 {metrics.totalAssessed} · 판단유보{" "}
        {metrics.totalUndetermined} · 철회 {metrics.totalRetracted}). 오류율은{" "}
        {metrics.measuredErrorRate.status === "measured"
          ? `${metrics.measuredErrorRate.value} ${metrics.measuredErrorRate.unit}`
          : "표본 부족으로 미측정"}
        입니다.
      </p>
      <p className={cm.staleCorrectionRequests > 0 ? "notice--warning" : undefined}>
        정정 요청 — 열림 {cm.openCorrectionRequests} · 방치({cm.staleThresholdDays}일 초과){" "}
        {cm.staleCorrectionRequests} · 수용 {cm.acceptedCorrections} · 기각 {cm.rejectedCorrections}.
        처리 소요 중앙값:{" "}
        {cm.latencyStatus === "measured"
          ? `${cm.medianCorrectionLatencyDays}일`
          : "아직 요청 없음(미측정)"}
        .
      </p>
    </section>
  );
}

