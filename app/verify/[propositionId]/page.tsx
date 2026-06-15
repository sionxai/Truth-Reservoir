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

  return (
    <main className="detail-page">
      <section className="verify-header">
        <p className="eyebrow">재현 가능한 해시</p>
        <h1>{proposition.canonicalProposition}</h1>
        <p className="mono breakable">{proposition.propositionId}</p>
      </section>
      <HashVerification proposition={proposition} />
    </main>
  );
}

