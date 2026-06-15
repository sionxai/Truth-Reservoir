import { notFound } from "next/navigation";
import { CorrectionTimeline } from "../../components/CorrectionTimeline";
import { DetailActions } from "../../components/DetailActions";
import { EvidenceNetwork } from "../../components/EvidenceNetwork";
import { GradePanel } from "../../components/GradePanel";
import { ReviewLogViewer } from "../../components/ReviewLogViewer";
import { legalStatusLabels } from "../../../lib/display.ts";
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

export default async function PropositionDetailPage({ params }: PageProps) {
  const { propositionId } = await params;
  const decodedId = decodePropositionId(propositionId);
  const propositions = await loadPropositions();
  const proposition = propositions.find((item) => item.propositionId === decodedId);

  if (!proposition) {
    notFound();
  }

  return (
    <main className="detail-page">
      {proposition.sensitive.sensitive ? (
        <section className="sensitive-notice">
          <strong>
            현 시점({proposition.asOfDate}) 기준. {proposition.sensitive.presumptionNotice}
          </strong>
          <span>{legalStatusLabels[proposition.sensitive.legalStatus]}</span>
        </section>
      ) : null}

      <EvidenceNetwork proposition={proposition} />

      <div className="detail-grid">
        <div className="detail-main">
          <GradePanel proposition={proposition} />
          <ReviewLogViewer reviewLog={proposition.reviewLog} />
          <CorrectionTimeline corrections={proposition.correctionHistory} />
          <section className="content-panel limitations-block" aria-labelledby="limitations-title">
            <h2 id="limitations-title">한계</h2>
            <p>{proposition.limitations}</p>
          </section>
        </div>
        <DetailActions proposition={proposition} />
      </div>
    </main>
  );
}

