import type { Metadata } from "next";
import { TopicThumbnail } from "./components/TopicThumbnail";
import { loadPropositions } from "../lib/data.ts";
import { claimNatureLabels, gradeLabels } from "../lib/display.ts";
import { type HomeTopicTile, isPublishedTopic, topicTiles } from "../lib/home-topics.ts";
import { absoluteSiteUrl, getRepoUrl, getSiteUrl } from "../lib/site.ts";

const siteUrl = getSiteUrl();
const homeTitle =
  "Truth Reservoir 진실저수지 — verified fact repository / public JSON API";
const homeDescription =
  "Truth Reservoir 진실저수지는 verified propositions, Cert v2.1, static JSON API, fact verification, Korean facts를 공개하는 정적 사실 저장소입니다.";
const TOPIC_GRID_BATCH_SIZE = 12;
const SEARCH_RESULT_BATCH_SIZE = 20;
const TOPIC_GRAPHICS: Readonly<Record<string, string>> = {
  "2026지방선거": "/graphics/topic-2026지방선거.webp",
  한국근현대사: "/graphics/topic-한국근현대사.webp",
  지구과학: "/graphics/topic-지구과학.webp",
  CDC: "/graphics/topic-CDC.webp",
  국제사건: "/graphics/topic-국제사건.webp",
  개인정보보호: "/graphics/topic-개인정보보호.webp"
};

const homeGuideCards = [
  {
    image: "/graphics/section-humans.webp",
    imageAlt: "책과 돋보기 3D 오브젝트",
    title: "사람을 위한 FACTS",
    description: "육하원칙·정정이력·출처가 한 기사에",
    href: "/about",
    linkLabel: "소개 보기"
  },
  {
    image: "/graphics/section-ai.webp",
    imageAlt: "칩과 데이터 노드 3D 오브젝트",
    title: "AI를 위한 데이터",
    description: "llms.txt와 JSON API로 전체 레코드 접근",
    href: "/llms.txt",
    linkLabel: "AI 사용 안내"
  },
  {
    image: "/graphics/section-verify.webp",
    imageAlt: "방패와 체크마크와 체인 3D 오브젝트",
    title: "재현 가능한 검증",
    description: "모든 인용은 원문과 sha256 해시로 재검증",
    href: "/api-docs",
    linkLabel: "API 문서 보기"
  }
] as const;

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: "/"
  }
};

const machineDataDownloads = [
  {
    "@type": "DataDownload",
    name: "Truth Reservoir compact search manifest",
    contentUrl: absoluteSiteUrl("/api/v2/search-index.json"),
    encodingFormat: "application/json"
  },
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
  },
  {
    "@type": "DataDownload",
    name: "Truth Reservoir full plain-text reservoir",
    contentUrl: absoluteSiteUrl("/llms-full.txt"),
    encodingFormat: "text/plain"
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
    href: absoluteSiteUrl("/api/v2/search-index.json"),
    label: "검색 매니페스트 (JSON)"
  },
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
    href: "/llms-full.txt",
    label: "AI 전체 텍스트"
  },
  {
    href: "/api-docs",
    label: "API 문서"
  }
] as const;

function scriptJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function jsonLdMarkup(data: unknown): { __html: string } {
  return { __html: scriptJson(data) };
}

function jsonScriptMarkup(data: unknown): { __html: string } {
  return { __html: scriptJson(data) };
}

function dateRangeLabel(tile: HomeTopicTile): string {
  if (!tile.dateRange.from || !tile.dateRange.to) {
    return "날짜범위 미상";
  }

  return `날짜범위 ${tile.dateRange.from}~${tile.dateRange.to}`;
}

function TopicTileLink({
  tile,
  variant
}: {
  tile: HomeTopicTile;
  variant: "large" | "small";
}) {
  const graphic = TOPIC_GRAPHICS[tile.tag];

  return (
    <a className={`topic-tile topic-tile--${variant}`} data-topic-tile={variant} href={tile.path}>
      {graphic ? (
        <img
          alt={`${tile.tag} 3D 오브젝트`}
          className={`topic-thumb topic-thumb--${variant}`}
          height={720}
          loading="lazy"
          src={graphic}
          width={720}
        />
      ) : (
        <TopicThumbnail tag={tile.tag} variant={variant} />
      )}
      <span className="topic-tile__body">
        <span className="topic-tile__tag">{tile.tag}</span>
        <span className="topic-tile__meta">
          {variant === "large"
            ? `사실 ${tile.count}개 · ${dateRangeLabel(tile)} · `
            : `사실 ${tile.count}개 · `}
          <time dateTime={tile.lastUpdated}>최종 수정 {tile.lastUpdated}</time>
        </span>
      </span>
    </a>
  );
}

export default async function Page() {
  const propositions = await loadPropositions();
  const tiles = topicTiles(propositions);
  // 완성(published) 주제만 대표 카드로. 나머지는 '준비중' — 명제는 아래 명제 탐색·API로 접근 가능.
  const heroTiles = tiles.filter((tile) => isPublishedTopic(tile.tag));
  const allTopicTiles = tiles.filter((tile) => !isPublishedTopic(tile.tag));
  const initialTopicTiles = allTopicTiles.slice(0, TOPIC_GRID_BATCH_SIZE);

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdMarkup(datasetJsonLd)}
      />
      <section className="home-identity" aria-labelledby="home-title">
        <div className="home-identity__copy">
          <p className="eyebrow">Truth Reservoir / 진실저수지</p>
          <h1 id="home-title">
            판정하지 않는 사실 저장소 — 모든 문장은 검증된 JSON에서 생성됩니다
          </h1>
        </div>
        <img
          alt="저수지 위에 떠 있는 데이터 블록과 검증 체크마크 3D 일러스트"
          className="home-identity__visual"
          height={1066}
          loading="eager"
          src="/graphics/hero-reservoir.webp"
          width={1600}
        />
      </section>

      <section className="home-guide" aria-labelledby="home-guide-title">
        <div className="section-heading">
          <p className="eyebrow">안내</p>
          <h2 id="home-guide-title">저수지 사용법</h2>
        </div>
        <div className="home-guide__grid">
          {homeGuideCards.map((card) => (
            <article className="home-guide-card" key={card.href}>
              <img
                alt={card.imageAlt}
                className="home-guide-card__image"
                height={720}
                loading="lazy"
                src={card.image}
                width={720}
              />
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <a href={card.href}>{card.linkLabel}</a>
            </article>
          ))}
        </div>
      </section>

      <section className="topic-hero" aria-labelledby="topic-hero-title">
        <div className="section-heading">
          <p className="eyebrow">주제</p>
          <h2 id="topic-hero-title">주제</h2>
        </div>
        <div className="topic-hero__grid">
          {heroTiles.map((tile) => (
            <TopicTileLink key={tile.tag} tile={tile} variant="large" />
          ))}
        </div>
      </section>

      <section className="proposition-search" aria-labelledby="proposition-search-title">
        <div className="section-heading">
          <p className="eyebrow">명제</p>
          <h2 id="proposition-search-title">명제 탐색</h2>
        </div>

        <form className="feed-search__controls proposition-search__controls" data-feed-search-form>
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
          검증 명제 {propositions.length}건
        </p>
        <p className="search-default-prompt" data-search-empty>
          명제는 검색하거나 위 주제로 탐색하세요
        </p>
        <div className="search-results" data-search-results />
        <div className="infinite-scroll-sentinel" data-search-sentinel hidden aria-hidden="true" />
        <script dangerouslySetInnerHTML={{ __html: feedSearchScript(propositions.length) }} />
      </section>

      <section className="all-topics" aria-labelledby="all-topics-title">
        <div className="section-heading">
          <p className="eyebrow">준비중</p>
          <h2 id="all-topics-title">준비중 주제</h2>
          <p className="section-note">
            아직 기사로 정리되지 않은 주제입니다. 검증된 명제는 위 명제 탐색과 각 태그
            페이지의 타임라인에서 이미 확인할 수 있습니다.
          </p>
        </div>
        <div className="topics-grid" data-topics-grid>
          {initialTopicTiles.map((tile) => (
            <TopicTileLink key={tile.tag} tile={tile} variant="small" />
          ))}
        </div>
        <div
          className="infinite-scroll-sentinel"
          data-topics-sentinel
          hidden={allTopicTiles.length <= initialTopicTiles.length}
          aria-hidden="true"
        />
        <script
          id="home-topic-tiles"
          type="application/json"
          dangerouslySetInnerHTML={jsonScriptMarkup(allTopicTiles)}
        />
        <script dangerouslySetInnerHTML={{ __html: topicGridScript() }} />
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
        <div className="ai-agent-steps" aria-labelledby="ai-agent-steps-title">
          <h3 id="ai-agent-steps-title">For AI agents</h3>
          <ol>
            <li>
              Read <span className="mono">/llms.txt</span>
            </li>
            <li>
              Fetch <span className="mono">/api/v2/search-index.json</span>
            </li>
            <li>
              Fetch <span className="mono">/api/v2/propositions/{"{id}"}.json</span>
            </li>
          </ol>
        </div>
        <p className="machine-access__footer-link">
          <a href="/api/v2/index.json">전체 명제 목록 (JSON)</a>
        </p>
      </section>
    </main>
  );
}

function feedSearchScript(totalCount: number): string {
  return `
(() => {
  const form = document.querySelector("[data-feed-search-form]");
  const queryInput = document.querySelector("[data-feed-query]");
  const claimNatureSelect = document.querySelector("[data-feed-claim-nature]");
  const gradeSelect = document.querySelector("[data-feed-grade]");
  const status = document.querySelector("[data-feed-status]");
  const prompt = document.querySelector("[data-search-empty]");
  const results = document.querySelector("[data-search-results]");
  const sentinel = document.querySelector("[data-search-sentinel]");
  const claimNatureLabels = ${scriptJson(claimNatureLabels)};
  const batchSize = ${SEARCH_RESULT_BATCH_SIZE};
  let records = null;
  let matches = [];
  let renderedCount = 0;
  let requestToken = 0;
  let active = false;

  if (!form || !queryInput || !claimNatureSelect || !gradeSelect || !status || !prompt || !results || !sentinel) {
    return;
  }

  const normalize = (value) => String(value || "").toLocaleLowerCase("ko").normalize("NFC").trim();
  const isDefaultState = () =>
    normalize(queryInput.value) === "" && claimNatureSelect.value === "all" && gradeSelect.value === "all";

  const humanPathFor = (record) => {
    const match = String(record.path || "").match(/\\/api\\/v2\\/propositions\\/([^/]+)\\.json$/);
    const dashId = match ? match[1] : String(record.propositionId || "").replace(/^stmt:/, "stmt-");
    return "/p/" + dashId + "/";
  };

  const loadIndex = async () => {
    if (records) {
      return records;
    }

    const response = await fetch("/api/v2/search-index.json");
    if (!response.ok) {
      throw new Error("Failed to load search index: " + response.status + " " + response.statusText);
    }

    const payload = await response.json();
    records = Array.isArray(payload.records) ? payload.records : [];
    return records;
  };

  const updateStatus = () => {
    if (!active) {
      status.textContent = "검증 명제 ${totalCount}건";
      return;
    }

    status.textContent = renderedCount + "건 표시 · 전체 " + matches.length + "건";
  };

  const clearResults = () => {
    results.replaceChildren();
    renderedCount = 0;
    sentinel.hidden = true;
  };

  const setDefaultState = () => {
    requestToken += 1;
    active = false;
    matches = [];
    clearResults();
    prompt.hidden = false;
    prompt.textContent = "명제는 검색하거나 위 주제로 탐색하세요";
    updateStatus();
  };

  const createResultCard = (record) => {
    const article = document.createElement("article");
    const badgeRow = document.createElement("div");
    const claimNatureBadge = document.createElement("span");
    const title = document.createElement("h2");
    const link = document.createElement("a");

    article.className = "facts-card search-result-card";
    badgeRow.className = "facts-card__badges";
    claimNatureBadge.className = "mini-badge";
    claimNatureBadge.textContent = claimNatureLabels[record.claimNature] || record.claimNature || "분류 미상";
    link.href = humanPathFor(record);
    link.textContent = record.canonical || record.propositionId || "명제";

    title.append(link);
    badgeRow.append(claimNatureBadge);
    article.append(badgeRow, title);

    return article;
  };

  const loadMoreResults = () => {
    if (!active || renderedCount >= matches.length) {
      sentinel.hidden = true;
      updateStatus();
      return;
    }

    const fragment = document.createDocumentFragment();
    const nextCount = Math.min(renderedCount + batchSize, matches.length);

    for (const record of matches.slice(renderedCount, nextCount)) {
      fragment.append(createResultCard(record));
    }

    results.append(fragment);
    renderedCount = nextCount;
    sentinel.hidden = renderedCount >= matches.length;
    updateStatus();
  };

  const applySearch = async () => {
    if (isDefaultState()) {
      setDefaultState();
      return;
    }

    const token = ++requestToken;
    active = true;
    clearResults();
    prompt.hidden = false;
    prompt.textContent = "불러오는 중입니다";
    status.textContent = "검색 중";

    try {
      const loadedRecords = await loadIndex();
      if (token !== requestToken) {
        return;
      }

      const query = normalize(queryInput.value);
      const claimNature = claimNatureSelect.value;
      const grade = gradeSelect.value;

      matches = loadedRecords.filter((record) => {
        const searchText = normalize([record.canonical, ...(record.tags || [])].join(" "));
        const recordGrade = record.factualGrade || "undetermined";
        const matchesText = !query || searchText.includes(query);
        const matchesClaimNature = claimNature === "all" || record.claimNature === claimNature;
        const matchesGrade = grade === "all" || recordGrade === grade;

        return matchesText && matchesClaimNature && matchesGrade;
      });

      prompt.hidden = matches.length > 0;
      prompt.textContent = matches.length > 0 ? "" : "조건에 맞는 명제가 없습니다";
      loadMoreResults();
      updateStatus();
    } catch (error) {
      if (token !== requestToken) {
        return;
      }

      console.error(error);
      matches = [];
      prompt.hidden = false;
      prompt.textContent = "검색 색인을 불러오지 못했습니다.";
      status.textContent = "검색 오류";
    }
  };

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", applySearch);
  form.addEventListener("change", applySearch);
  form.addEventListener("reset", () => window.setTimeout(setDefaultState, 0));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMoreResults();
      }
    });
    observer.observe(sentinel);
  }
})();
`;
}

function topicGridScript(): string {
  return `
(() => {
  const data = document.getElementById("home-topic-tiles");
  const grid = document.querySelector("[data-topics-grid]");
  const sentinel = document.querySelector("[data-topics-sentinel]");
  const batchSize = ${TOPIC_GRID_BATCH_SIZE};

  if (!data || !grid || !sentinel) {
    return;
  }

  let tiles = [];
  try {
    tiles = JSON.parse(data.textContent || "[]");
  } catch (error) {
    console.error(error);
    return;
  }

  let renderedCount = grid.querySelectorAll("[data-topic-tile]").length;
  const svgNs = "http://www.w3.org/2000/svg";

  const hashTag = (tag) => {
    let hash = 2166136261;
    for (const grapheme of Array.from(String(tag || "").normalize("NFC"))) {
      hash ^= grapheme.codePointAt(0) || 0;
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  const partsFor = (tag) => {
    const hash = hashTag(tag);
    return {
      hash,
      hueA: hash % 360,
      hueB: ((hash >>> 8) + 90) % 360,
      motif: hash % 3,
      initial: Array.from(String(tag || "").normalize("NFC"))[0] || "#",
      rotation: ((hash >>> 16) % 24) - 12
    };
  };

  const svgElement = (name, attrs = {}) => {
    const element = document.createElementNS(svgNs, name);
    for (const [key, value] of Object.entries(attrs)) {
      element.setAttribute(key, String(value));
    }
    return element;
  };

  const createTopicThumbnail = (tag) => {
    const parts = partsFor(tag);
    const gradientId = "topic-thumb-client-" + parts.hash.toString(16) + "-" + renderedCount;
    const motifColor = "hsl(" + parts.hueA + " 32% 54%)";
    const svg = svgElement("svg", {
      "aria-label": tag,
      class: "topic-thumb topic-thumb--small",
      role: "img",
      viewBox: "0 0 120 90",
      xmlns: svgNs
    });
    const defs = svgElement("defs");
    const gradient = svgElement("linearGradient", { id: gradientId, x1: "0", x2: "1", y1: "0", y2: "1" });
    const stopA = svgElement("stop", { offset: "0%", "stop-color": "hsl(" + parts.hueA + " 42% 90%)" });
    const stopB = svgElement("stop", { offset: "100%", "stop-color": "hsl(" + parts.hueB + " 38% 84%)" });
    const background = svgElement("rect", { fill: "url(#" + gradientId + ")", height: "90", rx: "8", width: "120" });
    const text = svgElement("text", {
      "dominant-baseline": "middle",
      fill: "#333d4b",
      "font-family": "'Pretendard Variable', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "font-size": "32",
      "font-weight": "800",
      opacity: "0.96",
      "text-anchor": "middle",
      x: "60",
      y: "47"
    });

    gradient.append(stopA, stopB);
    defs.append(gradient);
    svg.append(defs, background);

    if (parts.motif === 0) {
      svg.append(
        svgElement("circle", { cx: "24", cy: "24", fill: "none", opacity: "0.3", r: "34", stroke: motifColor, "stroke-width": "9" }),
        svgElement("circle", { cx: "96", cy: "66", fill: "none", opacity: "0.2", r: "28", stroke: motifColor, "stroke-width": "7" })
      );
    } else if (parts.motif === 1) {
      svg.append(
        svgElement("path", {
          d: "M-8 72 C24 36 42 28 70 42 S104 56 128 18",
          fill: "none",
          opacity: "0.26",
          stroke: motifColor,
          "stroke-linecap": "round",
          "stroke-width": "12"
        }),
        svgElement("path", {
          d: "M-4 22 C28 46 54 52 86 38 S112 20 126 30",
          fill: "none",
          opacity: "0.18",
          stroke: motifColor,
          "stroke-linecap": "round",
          "stroke-width": "8"
        })
      );
    } else {
      svg.append(
        svgElement("rect", {
          fill: motifColor,
          height: "82",
          opacity: "0.14",
          rx: "5",
          transform: "rotate(" + parts.rotation + " 60 45)",
          width: "22",
          x: "18",
          y: "4"
        }),
        svgElement("rect", {
          fill: motifColor,
          height: "82",
          opacity: "0.22",
          rx: "5",
          transform: "rotate(" + parts.rotation + " 60 45)",
          width: "22",
          x: "50",
          y: "4"
        }),
        svgElement("rect", {
          fill: motifColor,
          height: "82",
          opacity: "0.12",
          rx: "5",
          transform: "rotate(" + parts.rotation + " 60 45)",
          width: "22",
          x: "82",
          y: "4"
        })
      );
    }

    text.textContent = parts.initial;
    svg.append(text);
    return svg;
  };

  const createTopicTile = (tile) => {
    const link = document.createElement("a");
    const body = document.createElement("span");
    const tag = document.createElement("span");
    const meta = document.createElement("span");
    const lastUpdated = document.createElement("time");

    link.className = "topic-tile topic-tile--small";
    link.dataset.topicTile = "small";
    link.href = tile.path;
    body.className = "topic-tile__body";
    tag.className = "topic-tile__tag";
    tag.textContent = tile.tag;
    meta.className = "topic-tile__meta";
    lastUpdated.dateTime = tile.lastUpdated;
    lastUpdated.textContent = "최종 수정 " + tile.lastUpdated;
    meta.append(document.createTextNode("사실 " + tile.count + "개 · "), lastUpdated);

    body.append(tag, meta);
    link.append(createTopicThumbnail(tile.tag), body);
    return link;
  };

  const appendMoreTiles = () => {
    if (renderedCount >= tiles.length) {
      sentinel.hidden = true;
      return;
    }

    const fragment = document.createDocumentFragment();
    const nextCount = Math.min(renderedCount + batchSize, tiles.length);

    for (const tile of tiles.slice(renderedCount, nextCount)) {
      fragment.append(createTopicTile(tile));
    }

    grid.append(fragment);
    renderedCount = nextCount;
    sentinel.hidden = renderedCount >= tiles.length;
  };

  if (renderedCount >= tiles.length) {
    sentinel.hidden = true;
    return;
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        appendMoreTiles();
      }
    });
    observer.observe(sentinel);
  } else {
    appendMoreTiles();
  }
})();
`;
}
