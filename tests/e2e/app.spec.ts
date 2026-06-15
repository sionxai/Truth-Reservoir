import { expect, test } from "@playwright/test";
import { loadPropositions } from "../../lib/data.ts";
import { encodePropositionId } from "../../lib/ids.ts";
import type { Proposition } from "../../lib/types.ts";
import { findPredecessorSeed } from "../test-utils.ts";

let propositions: Proposition[];
let predecessor: Proposition;
let predecessorDashId: string;

test.beforeAll(async () => {
  propositions = await loadPropositions();
  predecessor = findPredecessorSeed(propositions);
  predecessorDashId = encodePropositionId(predecessor.propositionId);
});

test("E1 home search shows matching cards and empty state", async ({ page }) => {
  await page.goto("/");

  const search = page.getByLabel("검색어");
  await search.fill("개인정보");

  await expect(page.locator(".proposition-card").first()).toBeVisible();

  await search.fill("zzzzzz-no-matching-proposition");

  await expect(page.getByText("일치하는 검증 명제가 없습니다.")).toBeVisible();
});

test("E2 detail page exposes evidence, grades, review, corrections, and limitations", async ({
  page
}) => {
  await page.goto(`/p/${predecessorDashId}`);

  await expect(page.getByText("Primary Artifact / Evidence Network")).toBeVisible();
  await expect(page.getByText("기초 사실성 축")).toBeVisible();
  await expect(page.getByText("진술 충실성 축")).toBeVisible();
  await expect(page.getByText("gradeRationale")).toBeVisible();
  await expect(page.getByText(predecessor.assessment.gradeRationale)).toBeVisible();
  await expect(page.getByText("반론 검토 로그")).toBeVisible();
  await expect(page.getByRole("heading", { name: "정정 이력" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "한계" })).toBeVisible();
  await expect(page.getByText(predecessor.limitations)).toBeVisible();
  await expect(page.getByText("프레이밍 오염 신호")).toBeVisible();
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
