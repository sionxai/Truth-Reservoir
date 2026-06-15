export default function ApiDocsPage() {
  return (
    <main className="page readable-page">
      <section className="content-panel doc-panel">
        <p className="eyebrow">Static API</p>
        <h1>API 문서</h1>
        <p>
          진실저수지는 정적 파일로 Cert v2.0 데이터를 배포합니다. CORS는 <span className="mono">*</span>로 공개하는 것을 전제로 하며, 실제 계약은 JSON Schema와 OpenAPI 문서입니다.
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
          <span className="mono">/api/v2/index.json</span>은 <span className="mono">{"{ data, meta }"}</span> 형태입니다. <span className="mono">data</span>는 Cert v2.0 proposition 배열이고, <span className="mono">meta</span>는 총량, 데이터 버전, 생성 시각, 기관 메트릭 경로, 개별 proposition 경로 목록을 담습니다.
        </p>
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

