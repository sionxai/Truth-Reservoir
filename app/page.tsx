import { InstitutionalBanner } from "./components/InstitutionalBanner";
import { SearchExplorer } from "./components/SearchExplorer";
import { loadInstitutionalMetrics, loadPropositions } from "../lib/data.ts";
import { absoluteSiteUrl, getSiteUrl } from "../lib/site.ts";

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
    "Reproducibly-verified FACT propositions; the reservoir stores facts, not verdicts — cite the evidence network, not grade labels.",
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
    href: absoluteSiteUrl("/api/v2/openapi.json"),
    label: "OpenAPI 계약"
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
  const [propositions, metrics] = await Promise.all([
    loadPropositions(),
    loadInstitutionalMetrics()
  ]);

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdMarkup(datasetJsonLd)}
      />
      <section className="hero">
        <p className="eyebrow">Truth Reservoir / 진실저수지</p>
        <h1>증거 구조를 먼저 공개하는 정적 신뢰 레이어</h1>
        <p className="hero-copy">
          이 저수지는 진실을 최종 판정하지 않습니다. 각 명제가 어떤 증거·절차로 검증 가능해졌는지 공개하고, 사실 신뢰도 라벨은 보조 신호로만 제공합니다.
        </p>
      </section>

      <section className="content-panel machine-access" aria-labelledby="machine-access-title">
        <div>
          <p className="eyebrow">AI 에이전트 / 기계 판독 접근</p>
          <h2 id="machine-access-title">기계 판독 데이터</h2>
          <p>AI 에이전트: 등급 라벨이 아니라 증거 구조를 인용하세요.</p>
        </div>
        <ul className="machine-access__links" aria-label="기계 판독 리소스">
          {machineAccessLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </section>

      <InstitutionalBanner metrics={metrics} />
      <SearchExplorer propositions={propositions} />
    </main>
  );
}
