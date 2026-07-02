import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeBadge } from "../../components/GradeBadge";
import { loadPropositions } from "../../../lib/data.ts";
import { entityRegistry, entityRoute, roleLabel, type EntityRegistryEntry } from "../../../lib/entities.ts";
import { encodePropositionId } from "../../../lib/ids.ts";
import { sortByUpdatedDesc } from "../../../lib/propositions.ts";
import { absoluteSiteUrl } from "../../../lib/site.ts";
import type { Proposition } from "../../../lib/types.ts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const propositions = await loadPropositions();
  const registry = entityRegistry(propositions);

  return [...registry.values()].map((entry) => ({
    slug: entry.slug
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const propositions = await loadPropositions();
  const entity = findEntityBySlug(slug, entityRegistry(propositions));

  if (!entity) {
    return {
      title: "엔티티 허브 | 진실저수지"
    };
  }

  return {
    title: `${entity.name} | 엔티티 허브 | 진실저수지`,
    description: `${entity.name}이 등장하는 검증된 사건 목록`,
    alternates: {
      canonical: entityRoute(entity.entry.slug)
    }
  };
}

export default async function EntityPage({ params }: PageProps) {
  const { slug } = await params;
  const propositions = await loadPropositions();
  const registry = entityRegistry(propositions);
  const entity = findEntityBySlug(slug, registry);

  if (!entity) {
    notFound();
  }

  const byId = new Map(propositions.map((proposition) => [proposition.propositionId, proposition]));
  const matching = sortByUpdatedDesc(
    entity.entry.propositionIds.flatMap((propositionId) => {
      const proposition = byId.get(propositionId);

      return proposition ? [proposition] : [];
    })
  );
  const collectionJsonLd = buildCollectionJsonLd(entity.name, matching);

  return (
    <main className="page entity-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdMarkup(collectionJsonLd)}
      />
      <header className="entity-page__header">
        <p className="eyebrow">엔티티 허브</p>
        <h1>{entity.name}</h1>
        <p>이 엔티티가 등장하는 검증된 사건 {matching.length}건</p>
        <p className="entity-disclosure">
          엔티티 페이지는 탐색 허브입니다 — 이 엔티티에 관한 사실 주장이 아니라, 이
          엔티티가 등장하는 사건 목록입니다.
        </p>
      </header>

      <ul className="entity-proposition-list">
        {matching.map((proposition) => {
          const dashId = encodePropositionId(proposition.propositionId);
          const roles = entityRolesForProposition(entity.entry, proposition.propositionId);

          return (
            <li key={proposition.propositionId}>
              <Link className="entity-proposition-card" href={`/p/${dashId}`}>
                <span className="entity-proposition-card__meta">
                  <GradeBadge grade={proposition.assessment.factualGrade} />
                  {roles.map((role) => (
                    <span className="mini-badge" key={role}>
                      {roleLabel(role)}
                    </span>
                  ))}
                  <span className="mini-badge">
                    <time dateTime={proposition.asOfDate}>{proposition.asOfDate}</time> 기준
                  </span>
                </span>
                <span className="entity-proposition-card__title">
                  {proposition.canonicalProposition}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function findEntityBySlug(slug: string, registry: Map<string, EntityRegistryEntry>) {
  for (const [name, entry] of registry.entries()) {
    if (entry.slug === slug) {
      return { name, entry };
    }
  }

  return null;
}

function entityRolesForProposition(entry: EntityRegistryEntry, propositionId: string) {
  return (["who", "statedBy"] as const).filter((role) => entry.roles[role].includes(propositionId));
}

function buildCollectionJsonLd(entityName: string, propositions: Proposition[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: entityName,
    description: "이 엔티티가 등장하는 검증된 사건 목록",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: propositions.map((proposition, index) => {
        const dashId = encodePropositionId(proposition.propositionId);

        return {
          "@type": "ListItem",
          position: index + 1,
          url: absoluteSiteUrl(`/p/${dashId}/`)
        };
      })
    }
  };
}

function jsonLdMarkup(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
