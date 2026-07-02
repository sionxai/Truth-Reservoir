import { PropositionCard } from "./components/PropositionCard";
import { loadPropositions } from "../lib/data.ts";
import { claimNatureLabels, gradeLabels } from "../lib/display.ts";
import { sortByUpdatedDesc, tagRoute, uniqueTags } from "../lib/propositions.ts";
import { absoluteSiteUrl, getRepoUrl, getSiteUrl } from "../lib/site.ts";
import type { Proposition } from "../lib/types.ts";

const siteUrl = getSiteUrl();
const machineDataDownloads = [
  {
    "@type": "DataDownload",
    name: "Truth Reservoir proposition index",
    contentUrl: absoluteSiteUrl("/api/v2/index.json"),
    encodingFormat: "application/json"
  },
  {
    "@type": "DataDownload",
    name: "Truth Reservoir derived relation graph",
    contentUrl: absoluteSiteUrl("/api/v2/graph.json"),
    encodingFormat: "application/json"
  },
  {
    "@type": "DataDownload",
    name: "Truth Reservoir public request queue",
    contentUrl: absoluteSiteUrl("/api/v2/requests.json"),
    encodingFormat: "application/json"
  },
  {
    "@type": "DataDownload",
    name: "Truth Reservoir OpenAPI contract",
    contentUrl: absoluteSiteUrl("/api/v2/openapi.json"),
    encodingFormat: "application/json"
  },
  {
    "@type": "DataDownload",
    name: "Truth Reservoir Cert v2 JSON Schema",
    contentUrl: absoluteSiteUrl("/api/v2/schema/cert-v2.schema.json"),
    encodingFormat: "application/schema+json"
  }
] as const;

const datasetJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Truth Reservoir / 진실저수지",
  description:
    "FACTS 기사 페이지와 Cert v2.1 JSON 원본을 한 쌍으로 공개하는 정적 사실 저장소.",
  isAccessibleForFree: true,
  url: siteUrl,
  creator: {
    "@type": "Organization",
    name: "Truth Reservoir"
  },
  publisher: {
    "@type": "Organization",
    name: "Truth Reservoir"
  },
  distribution: machineDataDownloads
};

const machineAccessLinks = [
  {
    href: absoluteSiteUrl("/api/v2/index.json"),
    label: "명제 전체 (JSON)"
  },
  {
    href: absoluteSiteUrl("/api/v2/graph.json"),
    label: "관계 그래프 (JSON)"
  },
  {
    href: absoluteSiteUrl("/api/v2/requests.json"),
    label: "요청 큐 (JSON)"
  },
  {
    href: absoluteSiteUrl("/api/v2/openapi.json"),
    label: "OpenAPI 계약"
  },
  {
    href: `${getRepoUrl()}/tree/main/mcp`,
    label: "MCP 서버"
  },
  {
    href: absoluteSiteUrl("/api/v2/schema/cert-v2.schema.json"),
    label: "JSON Schema"
  },
  {
    href: "/llms.txt",
    label: "AI 사용 안내"
  },
  {
    href: "/api-docs",
    label: "API 문서"
  }
] as const;

function jsonLdMarkup(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export default async function Page() {
  const propositions = sortByUpdatedDesc(await loadPropositions());
  const tags = uniqueTags(propositions);

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdMarkup(datasetJsonLd)}
      />
      <section className="home-identity" aria-labelledby="home-title">
        <p className="eyebrow">Truth Reservoir / 진실저수지</p>
        <h1 id="home-title">
          판정하지 않는 사실 저장소 — 모든 문장은 검증된 JSON에서 생성됩니다
        </h1>
      </section>

      <section className="machine-access-compact" aria-labelledby="machine-access-title">
        <div>
          <p className="eyebrow">기계 판독 접근</p>
          <h2 id="machine-access-title">기계 판독 데이터</h2>
          <p>각 기사 페이지는 같은 ID의 JSON 원본과 일대일로 대응합니다.</p>
        </div>
        <ul className="machine-access__links" aria-label="기계 판독 리소스">
          {machineAccessLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="facts-feed" aria-labelledby="facts-feed-title">
        <section className="feed-search" aria-labelledby="feed-search-title">
          <div className="section-heading">
            <p className="eyebrow">찾기</p>
            <h2 id="feed-search-title">사건 찾기</h2>
            <p>
              검색어는 명제 문장과 태그에만 적용됩니다. 필터는 이미 렌더링된 사건 카드를
              화면에서만 숨기거나 다시 보여줍니다.
            </p>
          </div>

          <form className="feed-search__controls" data-feed-search-form>
            <label className="field field--wide">
              <span>검색어</span>
              <input
                autoComplete="off"
                data-feed-query
                placeholder="명제 또는 태그"
                type="search"
              />
            </label>

            <label className="field">
              <span>성격</span>
              <select data-feed-claim-nature defaultValue="all">
                <option value="all">전체</option>
                {Object.entries(claimNatureLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>라벨</span>
              <select data-feed-grade defaultValue="all">
                <option value="all">전체</option>
                {Object.entries(gradeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
                <option value="undetermined">판단유보</option>
              </select>
            </label>

            <div className="feed-search__actions">
              <button className="secondary" type="reset">
                초기화
              </button>
            </div>
          </form>

          <p className="feed-search__status" data-feed-status aria-live="polite">
            전체 {propositions.length}건
          </p>

          {tags.length ? (
            <nav className="tag-index" aria-labelledby="tag-index-title">
              <h3 id="tag-index-title">태그</h3>
              <ul className="tag-list">
                {tags.map((tag) => (
                  <li key={tag}>
                    <a href={tagRoute(tag)}>{tag}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </section>

        <div className="section-heading">
          <p className="eyebrow">FACTS 기사</p>
          <h2 id="facts-feed-title">사건 피드</h2>
        </div>
        <div className="facts-card-list">
          {propositions.map((proposition) => (
            <div
              className="facts-card-shell"
              data-claim-nature={proposition.claimNature}
              data-feed-item
              data-grade={proposition.assessment.factualGrade ?? "undetermined"}
              data-search-text={searchTextFor(proposition)}
              key={proposition.propositionId}
            >
              <PropositionCard proposition={proposition} />
            </div>
          ))}
        </div>
        <script dangerouslySetInnerHTML={{ __html: feedSearchScript(propositions.length) }} />
      </section>
    </main>
  );
}

function searchTextFor(proposition: Proposition): string {
  return [proposition.canonicalProposition, ...proposition.tags]
    .join(" ")
    .toLocaleLowerCase("ko")
    .normalize("NFC");
}

function feedSearchScript(totalCount: number): string {
  return `
(() => {
  const form = document.querySelector("[data-feed-search-form]");
  const items = Array.from(document.querySelectorAll("[data-feed-item]"));
  const queryInput = document.querySelector("[data-feed-query]");
  const claimNatureSelect = document.querySelector("[data-feed-claim-nature]");
  const gradeSelect = document.querySelector("[data-feed-grade]");
  const status = document.querySelector("[data-feed-status]");

  if (!form || !queryInput || !claimNatureSelect || !gradeSelect || items.length === 0) {
    return;
  }

  const normalize = (value) => String(value || "").toLocaleLowerCase("ko").normalize("NFC").trim();

  const applyFilters = () => {
    const query = normalize(queryInput.value);
    const claimNature = claimNatureSelect.value;
    const grade = gradeSelect.value;
    let visibleCount = 0;

    for (const item of items) {
      const matchesText = !query || normalize(item.dataset.searchText).includes(query);
      const matchesClaimNature = claimNature === "all" || item.dataset.claimNature === claimNature;
      const matchesGrade = grade === "all" || item.dataset.grade === grade;
      const visible = matchesText && matchesClaimNature && matchesGrade;

      item.hidden = !visible;
      if (visible) {
        visibleCount += 1;
      }
    }

    if (status) {
      status.textContent =
        visibleCount === ${totalCount} && !query && claimNature === "all" && grade === "all"
          ? "전체 ${totalCount}건"
          : visibleCount + "건 표시 · 전체 ${totalCount}건";
    }
  };

  form.addEventListener("input", applyFilters);
  form.addEventListener("change", applyFilters);
  form.addEventListener("reset", () => window.setTimeout(applyFilters, 0));
  applyFilters();
})();
`;
}
