import { notFound } from "next/navigation";
import { HashVerification } from "../../components/HashVerification";
import { loadPropositions } from "../../../lib/data.ts";
import { decodePropositionId, encodePropositionId } from "../../../lib/ids.ts";

type PageProps = {
  params: Promise<{ propositionId: string }>;
};

export async function generateStaticParams() {
  const propositions = await loadPropositions();

  return propositions.map((proposition) => ({
    propositionId: encodePropositionId(proposition.propositionId)
  }));
}

export default async function VerifyPage({ params }: PageProps) {
  const { propositionId } = await params;
  const decodedId = decodePropositionId(propositionId);
  const propositions = await loadPropositions();
  const proposition = propositions.find((item) => item.propositionId === decodedId);

  if (!proposition) {
    notFound();
  }

  const dashId = encodePropositionId(proposition.propositionId);
  const jsonPath = `/api/v2/propositions/${dashId}.json`;

  return (
    <main className="detail-page facts-detail-page verify-page">
      <article className="facts-article">
        <header className="facts-article__header">
          <p className="eyebrow">재현 가능한 해시</p>
          <h1>{proposition.canonicalProposition}</h1>
          <p>
            이 페이지는 저장된 짧은 증거 인용문, propositionId, versionId, certHash를
            브라우저에서 다시 계산합니다. 원본 Cert JSON은 빌드 시 생성된 정적 파일입니다.
          </p>
        </header>

        <section className="facts-section" aria-labelledby="stored-identifiers-title">
          <h2 id="stored-identifiers-title">저장된 식별자</h2>
          <dl className="facts-id-grid">
            <div>
              <dt>propositionId</dt>
              <dd>
                <code className="mono breakable">{proposition.propositionId}</code>
              </dd>
            </div>
            <div>
              <dt>versionId</dt>
              <dd>
                <code className="mono breakable">{proposition.versionId}</code>
              </dd>
            </div>
            <div>
              <dt>certHash</dt>
              <dd>
                <code className="mono breakable">{proposition.certHash}</code>
              </dd>
            </div>
          </dl>
          <a className="inline-resource-link" href={jsonPath}>
            Cert JSON 원본
          </a>
        </section>

        <section className="facts-section verify-reproduce" aria-labelledby="reproduce-title">
          <h2 id="reproduce-title">재현 절차</h2>
          <ol>
            <li>
              각 <span className="mono">evidence[].shortQuote</span>의 SHA-256을 계산해{" "}
              <span className="mono">evidence[].quoteHash</span>와 대조합니다.
            </li>
            <li>
              정규화한 <span className="mono">canonicalProposition</span>과{" "}
              <span className="mono">language</span>로 propositionId를 다시 계산합니다.
            </li>
            <li>
              quoteHash와 propositionId를 반영한 Cert 본문에서 versionId와 certHash를 다시
              계산합니다.
            </li>
          </ol>
        </section>

        <HashVerification proposition={proposition} />
      </article>
    </main>
  );
}
