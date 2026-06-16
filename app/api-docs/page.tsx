export default function ApiDocsPage() {
  return (
    <main className="page readable-page">
      <section className="content-panel doc-panel">
        <p className="eyebrow">Static API</p>
        <h1>API 문서</h1>
        <p>
          진실저수지는 정적 파일로 Cert v2.1 데이터를 배포합니다. CORS는 <span className="mono">*</span>로 공개하는 것을 전제로 하며, 실제 계약은 JSON Schema와 OpenAPI 문서입니다.
        </p>
      </section>

      <section className="content-panel doc-panel">
        <h2>엔드포인트</h2>
        <ul className="link-list">
          <li>
            <a href="/api/v2/index.json">GET /api/v2/index.json</a>
          </li>
          <li>
            <a href="/api/v2/propositions/stmt-840aa7c32d8f6372cd968fb6.json">
              GET /api/v2/propositions/{"{id}"}.json
            </a>
          </li>
          <li>
            <a href="/api/v2/schema/cert-v2.schema.json">
              GET /api/v2/schema/cert-v2.schema.json
            </a>
          </li>
          <li>
            <a href="/api/v2/openapi.json">GET /api/v2/openapi.json</a>
          </li>
          <li>
            <a href="/llms.txt">GET /llms.txt</a>
          </li>
        </ul>
      </section>

      <section className="content-panel doc-panel">
        <h2>인덱스 형태</h2>
        <p>
          <span className="mono">/api/v2/index.json</span>은 <span className="mono">{"{ data, meta }"}</span> 형태입니다. <span className="mono">data</span>는 Cert v2.1 proposition 배열이고, <span className="mono">meta</span>는 총량, 데이터 버전, 생성 시각, 기관 메트릭 경로, 개별 proposition 경로 목록을 담습니다.
        </p>
      </section>

      <section className="content-panel doc-panel">
        <h2>주요 필드</h2>
        <ul>
          <li>
            <span className="mono">assessment.factualGrade</span>는 단일 사실 신뢰도 보조 지표입니다. <span className="mono">truthfulGrade</span>와 <span className="mono">gradeDivergenceNote</span>는 계약에서 제거되었습니다.
          </li>
          <li>
            <span className="mono">claimNature</span>는 <span className="mono">event_occurrence</span>, <span className="mono">document_content</span>, <span className="mono">measurement</span> 중 하나입니다.
          </li>
          <li>
            <span className="mono">claimNature</span>가 <span className="mono">measurement</span>이면 <span className="mono">measurement.method</span>, <span className="mono">measurement.sample</span>, <span className="mono">measurement.aggregationBasis</span>, <span className="mono">measurement.producer</span>가 필요합니다. 측정이 아니면 <span className="mono">measurement</span>는 없어야 합니다.
          </li>
          <li>
            <span className="mono">reviewMode</span>는 <span className="mono">human_reviewed</span> 또는 <span className="mono">automated_unreviewed</span>입니다. 생략하면 <span className="mono">human_reviewed</span>로 해석됩니다.
          </li>
          <li>
            <span className="mono">evidence[].shortQuote</span>는 필수 무결성 앵커이며 15단어 이하여야 합니다. <span className="mono">evidence[].quoteHash</span>는 이 짧은 인용문에 대한 <span className="mono">sha256:</span> 접두 해시입니다.
          </li>
          <li>
            <span className="mono">evidence[].locator</span>는 선택 필드이며 <span className="mono">section</span>, <span className="mono">heading</span>, <span className="mono">page</span>로 출처 내 위치를 표현합니다. 이전 <span className="mono">evidenceSpans</span> 문자 오프셋은 계약에서 제거되었습니다.
          </li>
          <li>
            <span className="mono">evidence[].archiveStatus</span>는 <span className="mono">archived</span>, <span className="mono">archive_attempt_recommended</span>, <span className="mono">not_required_stable_artifact</span>, <span className="mono">unavailable</span> 중 하나입니다.
          </li>
        </ul>
      </section>

      <section className="content-panel doc-panel">
        <h2>dash-id 인코딩</h2>
        <p>
          내부 propositionId는 <span className="mono">stmt:840aa7c32d8f6372cd968fb6</span>처럼 콜론을 포함합니다. 정적 파일과 라우트에서는 첫 구분자만 대시로 바꾼 <span className="mono">stmt-840aa7c32d8f6372cd968fb6</span>를 사용합니다.
        </p>
      </section>
    </main>
  );
}
