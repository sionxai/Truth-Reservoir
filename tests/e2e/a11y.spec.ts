import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loadPropositions } from "../../lib/data.ts";
import { entityRegistry } from "../../lib/entities.ts";
import { encodePropositionId } from "../../lib/ids.ts";
import type { Proposition } from "../../lib/types.ts";
import { findPredecessorSeed } from "../test-utils.ts";

let predecessor: Proposition;
let predecessorDashId: string;
let centralElectionCommissionSlug: string;

test.beforeAll(async () => {
  const propositions = await loadPropositions();
  predecessor = findPredecessorSeed(propositions);
  predecessorDashId = encodePropositionId(predecessor.propositionId);
  const central = entityRegistry(propositions).get("중앙선거관리위원회");

  if (!central) {
    throw new Error("Expected 중앙선거관리위원회 entity to exist");
  }

  centralElectionCommissionSlug = central.slug;
});

async function expectNoCriticalA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((violation) => violation.impact === "critical");
  const serious = results.violations.filter((violation) => violation.impact === "serious");

  if (serious.length > 0) {
    console.warn(
      `Serious a11y violations: ${serious.map((violation) => violation.id).join(", ")}`
    );
  }

  expect(critical).toEqual([]);
}

test("home has no critical a11y violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "사건 피드" })).toBeVisible();

  await expectNoCriticalA11yViolations(page);
});

test("detail page has no critical a11y violations", async ({ page }) => {
  await page.goto(`/p/${predecessorDashId}`);
  await expect(page.getByText(predecessor.canonicalProposition)).toBeVisible();

  await expectNoCriticalA11yViolations(page);
});

test("verify page has no critical a11y violations", async ({ page }) => {
  await page.goto(`/verify/${predecessorDashId}`);
  await expect(page.getByText(/일치/).first()).toBeVisible();

  await expectNoCriticalA11yViolations(page);
});

test("entity hub has no critical a11y violations", async ({ page }) => {
  await page.goto(`/e/${centralElectionCommissionSlug}`);
  await expect(page.getByRole("heading", { name: "중앙선거관리위원회" })).toBeVisible();

  await expectNoCriticalA11yViolations(page);
});

test("woven topic page has no critical a11y violations", async ({ page }) => {
  // ASCII tag: the Next dev server can't match a non-ASCII param against decoded
  // generateStaticParams entries (dev-only 500 with output:'export'); the static
  // export renders every tag page. HIV covers the woven layout for the axe scan.
  await page.goto("/t/HIV/");
  await expect(page.getByRole("heading", { level: 1, name: "HIV" })).toBeVisible();

  await expectNoCriticalA11yViolations(page);
});
