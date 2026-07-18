import { loadInstitutionalMetrics } from "../../lib/data.ts";
import { InstitutionalBanner } from "../components/InstitutionalBanner";

export default async function AboutPage() {
  const metrics = await loadInstitutionalMetrics();

  return (
    <main className="detail-page facts-detail-page facts-doc-page">
      <article className="facts-article">
        <header className="facts-article__header">
          <p className="eyebrow">원칙</p>
          <h1>진실저수지 원칙</h1>
          <p>
            진실저수지는 명제·증거·검수·정정의 provenance 원장과 그것을 사람이 읽을 수
            있게 렌더링한 리더입니다. “믿어라”가 아니라 “재현하라”를 목표로 합니다.
            라벨은 “진실” 판정이 아니라 “검증 가능” 상태와 현 시점 기준 사실 신뢰도를
            보조적으로 보여주는 신호입니다.
          </p>
        </header>

        <InstitutionalBanner metrics={metrics} />

        <section className="facts-section doc-section" aria-labelledby="constitution-title">
          <h2 id="constitution-title">헌법 우선</h2>
          <p>
            최상위 규범은 <a href="/CONSTITUTION.md">CONSTITUTION.md</a>입니다. PRD나 하위
            문서와 충돌하면 헌법이 우선합니다. 헌법의 원칙을 집행 가능한 규칙으로 옮긴
            것이 <a href="/POLICY.md">기본방침(POLICY.md)</a>이며, 등재 조건·거부 사유·증거
            요건·검수 레인·정정 절차·품질 지표를 번호 체계로 규정합니다.
          </p>
          <ul>
            <li>제2조: 사실과 해석을 분리하고, 진실성 자체를 등급화하지 않습니다.</li>
            <li>제4조: 권위 있는 출처도 검증 면제 대상이 아닙니다.</li>
            <li>제5조: 결과보다 재현 가능한 증거 구조와 검증 경로를 공개합니다.</li>
            <li>제6조·제7조: 판단유보와 모름을 정직한 상태로 보존합니다.</li>
            <li>제11조: 자동 처리는 라벨로 표시하고 인간 책임을 유지합니다.</li>
          </ul>
        </section>

        <section className="facts-section doc-section" aria-labelledby="invariants-title">
          <h2 id="invariants-title">불변 원칙</h2>
          <ul>
            <li>증거 네트워크를 등급보다 먼저 공개합니다.</li>
            <li>사실 신뢰도 라벨은 보조 지표이며 진실 판정이 아닙니다.</li>
            <li>새 증거와 정정 이력을 버전으로 남깁니다.</li>
            <li>권위 출처 자체를 결론으로 대체하지 않습니다.</li>
            <li>판단유보는 애매 등급과 구분합니다.</li>
          </ul>
        </section>

        <section className="facts-section doc-section" aria-labelledby="boundary-title">
          <h2 id="boundary-title">공개/비공개 경계</h2>
          <p>
            공개 영역에는 proposition JSON, 증거 스냅샷 해시, 출처 URL, 반론 검토 로그,
            정정 이력이 포함됩니다. 민감 정보, 비공개 제보자의 신원, 재배포 권한이 없는
            원문 전문은 공개하지 않습니다.
          </p>
        </section>

        <section className="facts-section doc-section" aria-labelledby="label-title">
          <h2 id="label-title">라벨이 보장하는 것</h2>
          <p>
            라벨은 저장된 증거 스냅샷과 공개 절차가 재현 가능하다는 신호입니다. 출처 URL의
            현재 본문 동일성이나 명제의 영구 확정성을 보장하지 않습니다. 원문 동일성은
            보존본과 직접 대조해야 합니다.
          </p>
        </section>

        <section className="facts-section doc-section" aria-labelledby="governance-title">
          <h2 id="governance-title">운영 규범과 라이선스</h2>
          <p>
            전환 정책, 신규 발행 동결, 검수 책임 모델, 알려진 한계는{" "}
            <a
              href="https://github.com/sionxai/Truth-Reservoir/blob/main/GOVERNANCE.md"
              rel="noopener noreferrer"
            >
              GOVERNANCE.md
            </a>
            에 공개되어 있습니다. 코드는 MIT, 자체 작성 데이터·문서는 CC BY 4.0이며 제3자
            인용문은 라이선스 부여 대상이 아닙니다 —{" "}
            <a
              href="https://github.com/sionxai/Truth-Reservoir/blob/main/LICENSE-DATA.md"
              rel="noopener noreferrer"
            >
              LICENSE-DATA.md
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
