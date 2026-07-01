import { expect, test } from "@playwright/test";
import { loadPropositions } from "../../lib/data.ts";
import { encodePropositionId } from "../../lib/ids.ts";
import { sortByUpdatedDesc } from "../../lib/propositions.ts";
import type { Proposition } from "../../lib/types.ts";
import { findBallotShortageSeed, findPredecessorSeed } from "../test-utils.ts";

let propositions: Proposition[];
let predecessor: Proposition;
let predecessorDashId: string;
let ballotShortage: Proposition;
let ballotShortageDashId: string;

test.beforeAll(async () => {
  propositions = await loadPropositions();
  predecessor = findPredecessorSeed(propositions);
  predecessorDashId = encodePropositionId(predecessor.propositionId);
  ballotShortage = findBallotShortageSeed(propositions);
  ballotShortageDashId = encodePropositionId(ballotShortage.propositionId);
});

test("E1 home shows the server-rendered FACTS feed and machine links", async ({ page }) => {
  await page.goto("/");
  const [newest] = sortByUpdatedDesc(propositions);

  await expect(
    page.getByRole("heading", {
      name: "판정하지 않는 사실 저장소 — 모든 문장은 검증된 JSON에서 생성됩니다"
    })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "사건 피드" })).toBeVisible();
  await expect(page.getByRole("link", { name: "OpenAPI 계약" })).toBeVisible();
  await expect(page.getByRole("link", { name: "MCP 서버" })).toBeVisible();
  await expect(page.locator(".facts-card").first()).toContainText(newest.canonicalProposition);
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
  await expect(page.getByText("누가")).toBeVisible();
  await expect(page.getByText("중앙선거관리위원회가 밝힌 사유")).toBeVisible();
  await expect(page.getByRole("heading", { name: "집계·정정 이력" })).toBeVisible();
  await expect(page.getByText("투표용지 부족 투표소 50곳", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "측정 정보" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "민감 사안 고지" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "증거" })).toBeVisible();
  await expect(page.getByText(ballotShortage.evidence[0].shortQuote)).toBeVisible();
  await expect(page.getByRole("heading", { name: "한계" })).toBeVisible();
  await expect(page.getByText(ballotShortage.limitations)).toBeVisible();
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
