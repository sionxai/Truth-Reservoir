import { InstitutionalBanner } from "./components/InstitutionalBanner";
import { SearchExplorer } from "./components/SearchExplorer";
import { loadInstitutionalMetrics, loadPropositions } from "../lib/data.ts";

export default async function Page() {
  const [propositions, metrics] = await Promise.all([
    loadPropositions(),
    loadInstitutionalMetrics()
  ]);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Truth Reservoir / 진실저수지</p>
        <h1>증거 구조를 먼저 공개하는 정적 신뢰 레이어</h1>
        <p className="hero-copy">
          이 저수지는 진실을 최종 판정하지 않습니다. 각 명제가 어떤 증거·절차로 검증 가능해졌는지 공개하고, 사실 신뢰도 라벨은 보조 신호로만 제공합니다.
        </p>
      </section>

      <InstitutionalBanner metrics={metrics} />
      <SearchExplorer propositions={propositions} />
    </main>
  );
}
