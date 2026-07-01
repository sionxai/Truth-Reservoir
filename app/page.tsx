import { PropositionCard } from "./components/PropositionCard";
import { loadPropositions } from "../lib/data.ts";
import { sortByUpdatedDesc } from "../lib/propositions.ts";
import { absoluteSiteUrl, getRepoUrl, getSiteUrl } from "../lib/site.ts";

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
        <div className="section-heading">
          <p className="eyebrow">FACTS 기사</p>
          <h2 id="facts-feed-title">사건 피드</h2>
        </div>
        <div className="facts-card-list">
          {propositions.map((proposition) => (
            <PropositionCard proposition={proposition} key={proposition.propositionId} />
          ))}
        </div>
      </section>
    </main>
  );
}
