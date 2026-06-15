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
          이 저수지는 진실을 최종 판정하지 않습니다. 각 명제가 어떤 증거·절차로 어떤 신뢰 라벨을 받았는지 공개합니다. 새 증거가 나오면 라벨은 바뀝니다.
        </p>
      </section>

      <InstitutionalBanner metrics={metrics} />
      <SearchExplorer propositions={propositions} />
    </main>
  );
}
