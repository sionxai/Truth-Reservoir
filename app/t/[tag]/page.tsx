import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropositionCard } from "../../components/PropositionCard";
import { loadPropositions } from "../../../lib/data.ts";
import {
  propositionsWithTag,
  sortByUpdatedAsc,
  tagRoute,
  uniqueTags
} from "../../../lib/propositions.ts";

type PageProps = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  const propositions = await loadPropositions();

  return uniqueTags(propositions).map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tag = decodeTag((await params).tag);

  return {
    title: `#${tag} | 진실저수지`,
    description: `#${tag} 태그 FACTS 기사 목록`,
    alternates: {
      canonical: tagRoute(tag)
    }
  };
}

export default async function TagPage({ params }: PageProps) {
  const tag = decodeTag((await params).tag);
  const propositions = await loadPropositions();
  const tags = uniqueTags(propositions);

  if (!tags.includes(tag)) {
    notFound();
  }

  const matching = sortByUpdatedAsc(propositionsWithTag(propositions, tag));

  return (
    <main className="page tag-page">
      <header className="tag-page__header">
        <h1>#{tag}</h1>
        <p>{matching.length}건</p>
      </header>
      <div className="facts-card-list">
        {matching.map((proposition) => (
          <PropositionCard proposition={proposition} key={proposition.propositionId} />
        ))}
      </div>
    </main>
  );
}

function decodeTag(tag: string): string {
  try {
    return decodeURIComponent(tag);
  } catch {
    return tag;
  }
}
