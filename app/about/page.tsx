export default function AboutPage() {
  return (
    <main className="page readable-page">
      <section className="content-panel doc-panel">
        <p className="eyebrow">Protocol</p>
        <h1>진실저수지 원칙</h1>
        <p>
          진실저수지는 “믿어라”가 아니라 “재현하라”를 목표로 합니다. 라벨은 “진실” 판정이 아니라 “검증 가능” 상태와 현 시점 기준 사실 신뢰도를 보조적으로 보여주는 신호입니다.
        </p>
      </section>

      <section className="content-panel doc-panel">
        <h2>헌법 우선</h2>
        <p>
          최상위 규범은 <a href="/CONSTITUTION.md">CONSTITUTION.md</a>입니다. PRD나 하위 문서와 충돌하면 헌법이 우선합니다.
        </p>
        <ul>
          <li>제2조: 사실과 해석을 분리하고, 진실성 자체를 등급화하지 않습니다.</li>
          <li>제4조: 권위 있는 출처도 검증 면제 대상이 아닙니다.</li>
          <li>제5조: 결과보다 재현 가능한 증거 구조와 검증 경로를 공개합니다.</li>
          <li>제6조·제7조: 판단유보와 모름을 정직한 상태로 보존합니다.</li>
          <li>제11조: 자동 처리는 라벨로 표시하고 인간 책임을 유지합니다.</li>
        </ul>
      </section>

      <section className="content-panel doc-panel">
        <h2>불변 원칙</h2>
        <ul>
          <li>증거 네트워크를 등급보다 먼저 공개합니다.</li>
          <li>사실 신뢰도 라벨은 보조 지표이며 진실 판정이 아닙니다.</li>
          <li>새 증거와 정정 이력을 버전으로 남깁니다.</li>
          <li>권위 출처 자체를 결론으로 대체하지 않습니다.</li>
          <li>판단유보는 애매 등급과 구분합니다.</li>
        </ul>
      </section>

      <section className="content-panel doc-panel">
        <h2>공개/비공개 경계</h2>
        <p>
          공개 영역에는 proposition JSON, 증거 스냅샷 해시, 출처 URL, 반론 검토 로그, 정정 이력이 포함됩니다. 민감 정보, 비공개 제보자의 신원, 재배포 권한이 없는 원문 전문은 공개하지 않습니다.
        </p>
      </section>

      <section className="content-panel doc-panel">
        <h2>라벨이 보장하는 것</h2>
        <p>
          라벨은 저장된 증거 스냅샷과 공개 절차가 재현 가능하다는 신호입니다. 출처 URL의 현재 본문 동일성이나 명제의 영구 확정성을 보장하지 않습니다. 원문 동일성은 보존본과 직접 대조해야 합니다.
        </p>
      </section>
    </main>
  );
}
