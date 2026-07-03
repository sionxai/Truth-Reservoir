import { expect, test } from "@playwright/test";
import { loadPropositions } from "../../lib/data.ts";
import { entityRegistry, type EntityRegistryEntry } from "../../lib/entities.ts";
import { HERO_TOPIC_COUNT, topicTiles } from "../../lib/home-topics.ts";
import { encodePropositionId } from "../../lib/ids.ts";
import { relatedPropositions } from "../../lib/relations.ts";
import { tagRoute } from "../../lib/propositions.ts";
import { eventDateKey, monthBucketLabel, topicSummary } from "../../lib/topics.ts";
import type { Proposition } from "../../lib/types.ts";
import { findBallotShortageSeed, findPredecessorSeed } from "../test-utils.ts";

let propositions: Proposition[];
let predecessor: Proposition;
let predecessorDashId: string;
let ballotShortage: Proposition;
let ballotShortageDashId: string;
let centralElectionCommission: EntityRegistryEntry;

test.beforeAll(async () => {
  propositions = await loadPropositions();
  predecessor = findPredecessorSeed(propositions);
  predecessorDashId = encodePropositionId(predecessor.propositionId);
  ballotShortage = findBallotShortageSeed(propositions);
  ballotShortageDashId = encodePropositionId(ballotShortage.propositionId);
  const registry = entityRegistry(propositions);
  const central = registry.get("중앙선거관리위원회");

  if (!central) {
    throw new Error("Expected 중앙선거관리위원회 entity to exist");
  }

  centralElectionCommission = central;
});

test("E1 home shows topic-first discovery, search, and machine links", async ({ page }) => {
  await page.goto("/");
  const tiles = topicTiles(propositions);
  const electionTile = tiles.find(
    (tile) => tile.tag === "2026지방선거" || tile.tag === "투표용지부족"
  );

  if (!electionTile) {
    throw new Error("Expected a 6·3 local-election topic tile");
  }

  await expect(
    page.getByRole("heading", {
      name: "판정하지 않는 사실 저장소 — 모든 문장은 검증된 JSON에서 생성됩니다"
    })
  ).toBeVisible();
  // E1 was updated for the topic-first homepage; the old flat feed is no longer default-rendered.
  await expect(page.locator(".topic-hero .topic-tile--large")).toHaveCount(HERO_TOPIC_COUNT);
  await expect(
    page.locator(".topic-hero .topic-tile--large", { hasText: electionTile.tag })
  ).toHaveAttribute("href", electionTile.path);
  await expect(page.getByRole("heading", { name: "명제 탐색" })).toBeVisible();
  await expect(page.getByText(`검증 명제 ${propositions.length}건`)).toBeVisible();
  await expect(page.getByText("명제는 검색하거나 위 주제로 탐색하세요")).toBeVisible();
  await expect(page.locator(".facts-card-list")).toHaveCount(0);
  await expect(page.locator(".facts-card")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "OpenAPI 계약" })).toBeVisible();
  await expect(page.getByRole("link", { name: "MCP 서버" })).toBeVisible();
  await page.getByLabel("검색어").fill(ballotShortage.canonicalProposition);
  await expect(page.locator(".search-results .facts-card").first()).toContainText(
    ballotShortage.canonicalProposition
  );
});

test("E2 detail page exposes a FACTS article for humans and crawlers", async ({
  page
}) => {
  await page.goto(`/p/${ballotShortageDashId}`);

  await expect(page.getByRole("heading", { name: ballotShortage.canonicalProposition })).toBeVisible();
  await expect(page.getByText("대체로 신뢰").first()).toBeVisible();
  await expect(page.getByText("측정").first()).toBeVisible();
  await expect(page.getByText("인간검수").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "육하원칙" })).toBeVisible();
  await expect(page.getByText("누가", { exact: true })).toBeVisible();
  await expect(page.getByText("중앙선거관리위원회가 밝힌 사유")).toBeVisible();
  await expect(page.getByRole("heading", { name: "집계·정정 이력" })).toBeVisible();
  await expect(page.getByText("투표용지 부족 투표소 50곳", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "측정 정보" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "민감 사안 고지" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "증거" })).toBeVisible();
  await expect(page.getByText(ballotShortage.evidence[0].shortQuote)).toBeVisible();
  await expect(page.getByRole("heading", { name: "한계" })).toBeVisible();
  await expect(page.getByText(ballotShortage.limitations)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "관련 엔티티" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "관련 엔티티" })
      .getByRole("link", { name: /중앙선거관리위원회/ })
  ).toHaveAttribute("href", `/e/${centralElectionCommission.slug}/`);
  await expect(page.locator("dd .entity-field-link", { hasText: "중앙선거관리위원회" })).toHaveAttribute(
    "href",
    `/e/${centralElectionCommission.slug}/`
  );
  await expect(
    page.getByRole("link", { name: "중앙선거관리위원회가 밝힌 사유" })
  ).toHaveAttribute("href", `/e/${centralElectionCommission.slug}/`);
  await expect(
    page.locator("h1 .entity-inline-link", { hasText: "중앙선거관리위원회" })
  ).toHaveAttribute("href", `/e/${centralElectionCommission.slug}/`);
  await expect(page.getByRole("heading", { name: "관련 FACTS" })).toBeVisible();
  await expect(
    page.getByText("태그 교집합으로 자동 선정됩니다 — 편집자가 고르지 않습니다")
  ).toBeVisible();
  for (const related of relatedPropositions(ballotShortage, propositions)) {
    const relatedDashId = encodePropositionId(related.proposition.propositionId);

    await expect(
      page.getByRole("link", { name: related.proposition.canonicalProposition })
    ).toHaveAttribute("href", `/p/${relatedDashId}/`);
  }
  await expect(page.getByRole("link", { name: "이 사건의 JSON 원본" })).toHaveAttribute(
    "href",
    `/api/v2/propositions/${ballotShortageDashId}.json`
  );
  await expect(page.getByRole("link", { name: "검증 페이지" })).toHaveAttribute(
    "href",
    `/verify/${ballotShortageDashId}/`
  );
});

test("E3 verify page shows matching hash badges and the overclaim notice", async ({ page }) => {
  await page.goto(`/verify/${predecessorDashId}`);

  await expect(
    page.getByText("저장된 증거 스냅샷의 무결성만 확인합니다")
  ).toBeVisible();
  await expect(page.getByText(/일치/).first()).toBeVisible();
});

test("E4 correction CTA links to a GitHub issue URL with the propositionId", async ({ page }) => {
  await page.goto(`/p/${predecessorDashId}`);

  const href = await page.getByRole("link", { name: "GitHub Issue 열기" }).getAttribute("href");

  expect(href).toBeTruthy();
  expect(href).toContain("/issues/new");
  expect(decodeURIComponent(href ?? "")).toContain(predecessor.propositionId);
});

test("E5 static API index is served by the app", async ({ request }) => {
  const response = await request.get("/api/v2/index.json");

  expect(response.status()).toBe(200);

  const body = (await response.json()) as { data?: unknown; meta?: { total?: unknown } };

  expect(Array.isArray(body.data)).toBe(true);
  expect(body.meta?.total).toBe(propositions.length);
});

test("E6 entity hub lists propositions without profile claims", async ({ page }) => {
  await page.goto(`/e/${centralElectionCommission.slug}`);

  await expect(page.getByRole("heading", { name: "중앙선거관리위원회" })).toBeVisible();
  await expect(page.getByText("이 엔티티가 등장하는 검증된 사건")).toBeVisible();
  await expect(
    page.getByText(
      "엔티티 페이지는 탐색 허브입니다 — 이 엔티티에 관한 사실 주장이 아니라, 이 엔티티가 등장하는 사건 목록입니다."
    )
  ).toBeVisible();
  await expect(page.getByText("누가").first()).toBeVisible();
  await expect(page.getByText("밝힌 주체").first()).toBeVisible();

  for (const propositionId of centralElectionCommission.propositionIds) {
    const proposition = propositions.find((item) => item.propositionId === propositionId);

    if (!proposition) {
      throw new Error(`Missing proposition for ${propositionId}`);
    }

    const dashId = encodePropositionId(proposition.propositionId);
    const card = page.locator(".entity-proposition-card", {
      hasText: proposition.canonicalProposition
    });

    await expect(card).toHaveAttribute("href", `/p/${dashId}/`);
  }
});

test("E7 topic page is a woven long-form view in deterministic event-date order", async ({
  page
}) => {
  // ASCII tag: the Next dev server (output:'export') cannot match a non-ASCII param
  // against decoded generateStaticParams entries, so a Korean tag 500s in dev only
  // (the static-export build renders every tag page fine — see `next build`). HIV
  // exercises the full woven view: multiple facts, year-only dates that emit no
  // false-precision month heading, a real month bucket, and the propositionId
  // tie-break between two same-date facts.
  const tag = "HIV";
  const summary = topicSummary(tag, propositions);
  const byId = new Map(propositions.map((item) => [item.propositionId, item]));
  const ordered = summary.propositionIds.map((id) => byId.get(id)!);

  await page.goto(tagRoute(tag));

  // Header: tag as H1, meta row (count · date range · source total), disclosure.
  await expect(page.getByRole("heading", { level: 1, name: tag })).toBeVisible();
  await expect(page.getByText(`사실 ${summary.count}개`)).toBeVisible();
  await expect(
    page.getByText(`날짜범위 ${summary.dateRange.from}~${summary.dateRange.to}`)
  ).toBeVisible();
  await expect(page.getByText(`출처 합계 ${summary.sourceTotal}`)).toBeVisible();
  await expect(
    page.getByText(
      "이 페이지는 태그가 같은 검증된 사실을 사건 발생 시점 순으로 자동 집계합니다. 서사·해석은 없으며 편집자가 배열하지 않습니다. 각 문장은 독립 검증된 명제이며 클릭하면 원문·출처로 이동합니다."
    )
  ).toBeVisible();

  // 전문 복사하기: the button is wired to a deterministic full-text mirror of the woven
  // article, embedded as a JSON island so the copied text equals the rendered facts.
  // We assert the button and the island content (first fact + tag + reservoir footer);
  // the clipboard write itself is a standard browser API fired on a real user gesture
  // (headless clipboard success is environment-dependent and not asserted here).
  await expect(page.getByRole("button", { name: "전문 복사하기" })).toBeVisible();
  const fullTextIsland = await page.locator("#topic-fulltext").textContent();
  const fullText = JSON.parse(fullTextIsland ?? '""') as string;
  expect(fullText).toContain(tag);
  expect(fullText).toContain(ordered[0].canonicalProposition);
  expect(fullText).toContain("진실저수지");

  // Woven view, not a card grid: fact paragraphs are visible and there is no card list.
  await expect(page.locator(".facts-card-list")).toHaveCount(0);
  await expect(page.locator(".facts-card")).toHaveCount(0);
  await expect(page.locator(".topic-fact__text")).toHaveCount(ordered.length);

  // The first fact paragraph (deterministic order) is server-rendered and visible.
  const first = ordered[0];
  await expect(page.locator(".topic-fact__text").first()).toHaveText(
    first.canonicalProposition
  );
  // Each fact links to its /p/{dashId}/ page.
  const firstDashId = encodePropositionId(first.propositionId);
  await expect(
    page.locator(".topic-fact", { hasText: first.canonicalProposition }).getByRole("link", {
      name: "원문 →"
    })
  ).toHaveAttribute("href", `/p/${firstDashId}/`);

  // Neutral auto-derived month subheadings appear (no thematic labels).
  const buckets: string[] = [];
  let lastBucket: string | null = null;
  for (const proposition of ordered) {
    const bucket = monthBucketLabel(eventDateKey(proposition));
    if (bucket && bucket !== lastBucket) {
      buckets.push(bucket);
      lastBucket = bucket;
    }
  }
  for (const bucket of buckets) {
    await expect(page.getByRole("heading", { level: 2, name: bucket })).toBeVisible();
  }

  // CollectionPage JSON-LD lists member pages, asserts no verdict about the topic.
  const jsonLd = await page.locator('script[type="application/ld+json"]').innerText();
  const parsed = JSON.parse(jsonLd) as {
    "@type": string;
    hasPart: Array<{ url: string }>;
  };
  expect(parsed["@type"]).toBe("CollectionPage");
  expect(parsed.hasPart).toHaveLength(ordered.length);
  expect(parsed.hasPart[0].url).toContain(`/p/${firstDashId}/`);
});
