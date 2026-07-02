import { getSiteUrl } from "../../lib/site.ts";

export default function ApiDocsPage() {
  const siteUrl = getSiteUrl();

  return (
    <main className="detail-page facts-detail-page facts-doc-page">
      <article className="facts-article">
        <header className="facts-article__header">
          <p className="eyebrow">정적 API</p>
          <h1>API 문서</h1>
          <p>
            진실저수지는 정적 파일로 Cert v2.1 데이터를 배포합니다. CORS는{" "}
            <span className="mono">*</span>로 공개하는 것을 전제로 하며, 실제 계약은 JSON
            Schema와 OpenAPI 문서입니다.
          </p>
        </header>

        <section className="facts-section doc-section" aria-labelledby="endpoints-title">
          <h2 id="endpoints-title">엔드포인트</h2>
          <ul className="link-list">
            <li>
              <a href="/api/v2/search-index.json">GET /api/v2/search-index.json</a>
            </li>
            <li>
              <a href="/api/v2/index.json">GET /api/v2/index.json</a>
            </li>
            <li>
              <a href="/api/v2/graph.json">GET /api/v2/graph.json</a>
            </li>
            <li>
              <a href="/api/v2/entities.json">GET /api/v2/entities.json</a>
            </li>
            <li>
              <a href="/api/v2/requests.json">GET /api/v2/requests.json</a>
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
              <a href="/api/v2/schema/institutional-metrics.schema.json">
                GET /api/v2/schema/institutional-metrics.schema.json
              </a>
            </li>
            <li>
              <a href="/api/v2/openapi.json">GET /api/v2/openapi.json</a>
            </li>
            <li>
              <a href="/.well-known/ai-plugin.json">GET /.well-known/ai-plugin.json</a>
            </li>
            <li>
              <a href="/llms.txt">GET /llms.txt</a>
            </li>
            <li>
              <a href="/llms-full.txt">GET /llms-full.txt</a>
            </li>
          </ul>
        </section>

        <section className="facts-section doc-section" aria-labelledby="search-index-title">
          <h2 id="search-index-title">검색 매니페스트</h2>
          <p>
            <span className="mono">/api/v2/search-index.json</span>은 AI 에이전트와
            클라이언트가 전체 Cert 본문을 받기 전에 후보를 좁히도록 만든 작은 정적
            매니페스트입니다.
          </p>
          <p>
            형태는 <span className="mono">{"{ meta, records }"}</span>입니다. 각 record는{" "}
            <span className="mono">propositionId</span>, 전체 JSON{" "}
            <span className="mono">path</span>, <span className="mono">canonical</span>,{" "}
            <span className="mono">tags</span>, <span className="mono">claimNature</span>,{" "}
            <span className="mono">factualGrade</span>, <span className="mono">status</span>,{" "}
            <span className="mono">asOfDate</span>, <span className="mono">updatedAt</span>만
            담습니다.
          </p>
        </section>

        <section className="facts-section doc-section" aria-labelledby="graph-shape-title">
          <h2 id="graph-shape-title">관계 그래프</h2>
          <p>
            <span className="mono">/api/v2/graph.json</span>은 태그 교집합으로 빌드 시점에
            결정론적으로 파생한 관계만 담습니다. 이 관계는 탐색용 레이어이며 Cert 원본에는
            저장되지 않습니다.
          </p>
          <p>
            형태는 <span className="mono">{"{ meta, nodes, edges }"}</span>입니다.{" "}
            <span className="mono">nodes</span>는 propositionId, 페이지 경로, 태그를 담고,{" "}
            <span className="mono">edges</span>는 공유 태그가 하나 이상인 두 명제를{" "}
            <span className="mono">from &lt; to</span> 순서의 무방향 간선으로 한 번만 담습니다.
          </p>
        </section>

        <section className="facts-section doc-section" aria-labelledby="entities-shape-title">
          <h2 id="entities-shape-title">엔티티 허브</h2>
          <p>
            <span className="mono">/api/v2/entities.json</span>은{" "}
            <span className="mono">sixW.who</span>와{" "}
            <span className="mono">sixW.why[].statedBy</span>의 정확한 문자열에서만 빌드
            시점에 결정론적으로 파생한 탐색 허브입니다. 이 레이어는 Cert 원본에는 저장되지
            않으며 엔티티 자체에 관한 사실 주장이나 프로필이 아닙니다(제15).
          </p>
          <p>
            형태는 <span className="mono">{"{ meta, entities }"}</span>입니다. 각 entity는{" "}
            <span className="mono">name</span>, <span className="mono">slug</span>, 페이지{" "}
            <span className="mono">path</span>, 등장 명제 수,{" "}
            <span className="mono">propositionIds</span>, 역할별 명제 id 목록을 담습니다.
          </p>
        </section>

        <section className="facts-section doc-section" aria-labelledby="request-lane-title">
          <h2 id="request-lane-title">요청 레인</h2>
          <p>
            읽기 레인은 <span className="mono">GET /api/v2/*</span>로 검증 기록을 읽는
            경로입니다. 요청 레인은 저수지에 아직 없는 fact-data를 GitHub 공개 큐에 요청하는
            경로입니다.
          </p>
          <p>
            요청은 수요이지 사실이 아닙니다. 요청은 검증된 명제로 저장되지 않으며(제2),
            등재 여부는 정상 검증 파이프라인과 인간 승인(제11)을 거친 뒤 결정됩니다.
            검증 불가 요청은 declined 또는 undetermined로 정직하게 기록됩니다(제7). 큐는
            GitHub를 통한 공개 append-only 기록입니다(제8). 수요는 선택의 투명한 입력 중
            하나입니다(제14).
          </p>
          <ul>
            <li>
              제출: <span className="mono">.github/ISSUE_TEMPLATE/fact-request.yml</span>{" "}
              Issue Form은 요청 주제, 필요 이유, <span className="mono">claimNature</span>{" "}
              추정값, 후보 출처, 선택적 requester id를 받습니다. 자동 라벨은{" "}
              <span className="mono">fact-request</span>입니다.
            </li>
            <li>
              읽기: <a href="/api/v2/requests.json">GET /api/v2/requests.json</a>은 열린{" "}
              <span className="mono">fact-request</span> 이슈를 정적 JSON으로 미러링합니다.
              GitHub 공개 API가 빌드 중 실패하면 빈 큐와 사유 note를 발행하고 빌드는
              계속됩니다.
            </li>
            <li>
              MCP:{" "}
              <span className="mono">
                request_fact(topic, why?, claimNatureGuess?, candidateSources?)
              </span>
              는 사전 채워진 GitHub Issue 생성 URL을 반환합니다. 이 도구는 검증을 요청할
              뿐 사실을 주입하거나 저장하지 않습니다.{" "}
              <span className="mono">list_open_requests()</span>는 공개{" "}
              <span className="mono">requests.json</span>에서 열린 요청을 읽습니다.
            </li>
          </ul>
        </section>

        <section className="facts-section doc-section" aria-labelledby="ai-faq-title">
          <h2 id="ai-faq-title">AI 사용 FAQ</h2>
          <h3>검색 방법</h3>
          <p>
            먼저 <span className="mono">/api/v2/search-index.json</span>을 가져와{" "}
            <span className="mono">canonical</span>, <span className="mono">tags</span>,{" "}
            <span className="mono">claimNature</span>, <span className="mono">factualGrade</span>,{" "}
            <span className="mono">status</span>, 날짜 필드로 로컬 필터링합니다. 이후 필요한
            후보만 <span className="mono">/api/v2/propositions/{"{dash-id}"}.json</span>에서
            가져옵니다.
          </p>
          <h3>엔티티 허브 사용 방법</h3>
          <p>
            <span className="mono">/api/v2/entities.json</span> 또는{" "}
            <span className="mono">/e/{"{slug}"}/</span>는 정확히 파생된 엔티티 문자열에서
            명제 목록으로 이동하기 위한 경로입니다. 인물·조직·법률·통계 속성을 추론하는
            프로필로 사용하지 않습니다.
          </p>
          <h3>검증 방법</h3>
          <p>
            각 <span className="mono">evidence[].shortQuote</span>의 SHA-256을 다시 계산해{" "}
            <span className="mono">quoteHash</span>와 비교하고,{" "}
            <span className="mono">canonicalProposition</span>과{" "}
            <span className="mono">language</span>로 <span className="mono">propositionId</span>를
            재계산합니다. 그 다음 Cert v2.1 규칙으로 <span className="mono">versionId</span>와{" "}
            <span className="mono">certHash</span>를 재계산합니다.
          </p>
          <h3>인용 방법</h3>
          <p>
            사람에게는 <span className="mono">/p/{"{dash-id}"}/</span>를, 기계 검증에는{" "}
            <span className="mono">/api/v2/propositions/{"{dash-id}"}.json</span>을 인용합니다.
            요약에는 등급보다 증거 구조, 출처 provenance, locator/archiveStatus,
            quoteHash 대조, sixW 귀속, 정정 이력, 한계, reviewLog를 먼저 남깁니다.
          </p>
          <h3>저장하지 않는 것</h3>
          <p>
            진실저수지는 검증된 명제와 증거 구조를 저장하며, 판정문이나 해석을 저장하지
            않습니다(제2). <span className="mono">factualGrade</span>는 탐색 보조 신호이지
            ClaimReview식 결론이 아닙니다.
          </p>
        </section>

        <section className="facts-section doc-section" aria-labelledby="index-shape-title">
          <h2 id="index-shape-title">인덱스 형태</h2>
          <p>
            <span className="mono">/api/v2/index.json</span>은{" "}
            <span className="mono">{"{ data, meta }"}</span> 형태입니다.{" "}
            <span className="mono">data</span>는 Cert v2.1 proposition 배열이고,{" "}
            <span className="mono">meta</span>는 총량, 데이터 버전, 생성 시각, 기관 메트릭
            경로, 개별 proposition 경로 목록을 담습니다.
          </p>
        </section>

        <section className="facts-section doc-section" aria-labelledby="fields-title">
          <h2 id="fields-title">주요 필드</h2>
          <ul>
            <li>
              <span className="mono">assessment.factualGrade</span>는 단일 사실 신뢰도 보조
              지표입니다. <span className="mono">truthfulGrade</span>와{" "}
              <span className="mono">gradeDivergenceNote</span>는 계약에서 제거되었습니다.
            </li>
            <li>
              <span className="mono">claimNature</span>는{" "}
              <span className="mono">event_occurrence</span>,{" "}
              <span className="mono">document_content</span>,{" "}
              <span className="mono">measurement</span> 중 하나입니다.
            </li>
            <li>
              <span className="mono">claimNature</span>가{" "}
              <span className="mono">measurement</span>이면{" "}
              <span className="mono">measurement.method</span>,{" "}
              <span className="mono">measurement.sample</span>,{" "}
              <span className="mono">measurement.aggregationBasis</span>,{" "}
              <span className="mono">measurement.producer</span>가 필요합니다. 측정이 아니면{" "}
              <span className="mono">measurement</span>는 없어야 합니다.
            </li>
            <li>
              <span className="mono">reviewMode</span>는{" "}
              <span className="mono">human_reviewed</span> 또는{" "}
              <span className="mono">automated_unreviewed</span>입니다. 생략하면{" "}
              <span className="mono">human_reviewed</span>로 해석됩니다.
            </li>
            <li>
              <span className="mono">evidence[].shortQuote</span>는 필수 무결성 앵커이며
              15단어 이하여야 합니다. <span className="mono">evidence[].quoteHash</span>는
              이 짧은 인용문에 대한 <span className="mono">sha256:</span> 접두 해시입니다.
            </li>
            <li>
              <span className="mono">evidence[].locator</span>는 선택 필드이며{" "}
              <span className="mono">section</span>, <span className="mono">heading</span>,{" "}
              <span className="mono">page</span>로 출처 내 위치를 표현합니다. 이전{" "}
              <span className="mono">evidenceSpans</span> 문자 오프셋은 계약에서
              제거되었습니다.
            </li>
            <li>
              <span className="mono">evidence[].archiveStatus</span>는{" "}
              <span className="mono">archived</span>,{" "}
              <span className="mono">archive_attempt_recommended</span>,{" "}
              <span className="mono">not_required_stable_artifact</span>,{" "}
              <span className="mono">unavailable</span> 중 하나입니다.
            </li>
          </ul>
        </section>

        <section className="facts-section doc-section" aria-labelledby="dash-id-title">
          <h2 id="dash-id-title">dash-id 인코딩</h2>
          <p>
            내부 propositionId는{" "}
            <span className="mono">stmt:840aa7c32d8f6372cd968fb6</span>처럼 콜론을
            포함합니다. 정적 파일과 라우트에서는 첫 구분자만 대시로 바꾼{" "}
            <span className="mono">stmt-840aa7c32d8f6372cd968fb6</span>를 사용합니다.
          </p>
        </section>

        <section className="facts-section doc-section" aria-labelledby="agent-access-title">
          <h2 id="agent-access-title">AI 에이전트 접근</h2>
          <p>
            라이브 기준 URL은 <span className="mono">{siteUrl}</span>입니다. 에이전트는
            등급 라벨을 결론처럼 인용하지 말고, 증거 네트워크·출처 provenance·
            <span className="mono">quoteHash</span> 대조·
            <span className="mono">reviewLog</span>를 인용해야 합니다.{" "}
            <span className="mono">assessment.factualGrade</span>는 탐색을 돕는 보조
            신호입니다.
          </p>
          <ol>
            <li>
              <span className="mono">/api/v2/search-index.json</span>을 가져와{" "}
              <span className="mono">canonical</span>,{" "}
              <span className="mono">claimNature</span>,{" "}
              <span className="mono">tags</span>로 후보를 좁힙니다.
            </li>
            <li>
              후보의 <span className="mono">path</span> 또는{" "}
              <span className="mono">/api/v2/propositions/{"{dash-id}"}.json</span>에서 전체
              Cert v2.1 JSON을 가져옵니다.
            </li>
            <li>
              각 <span className="mono">evidence[].shortQuote</span>의 SHA-256을 계산해{" "}
              <span className="mono">evidence[].quoteHash</span>와 비교하고,
              locator·archiveStatus·archiveUrl을 함께 확인합니다.
            </li>
            <li>
              최종 요약에는 사실 판정 문구보다 evidence network, independenceGroupId,
              source provenance, reviewLog의 redteam·symmetry·authorityCheck를 먼저
              남깁니다.
            </li>
          </ol>
          <p>MCP 클라이언트는 별도 패키지를 stdio 서버로 실행할 수 있습니다.</p>
          <pre>
            <code>{`{
  "mcpServers": {
    "truth-reservoir": {
      "command": "npx",
      "args": [
        "tsx",
        "/absolute/path/to/truthreservoir/mcp/src/server.ts"
      ],
      "env": {
        "TRUTH_RESERVOIR_BASE_URL": "${siteUrl}"
      }
    }
  }
}`}</code>
          </pre>
        </section>
      </article>
    </main>
  );
}
