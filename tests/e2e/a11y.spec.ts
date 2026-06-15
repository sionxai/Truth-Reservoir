import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loadPropositions } from "../../lib/data.ts";
import { encodePropositionId } from "../../lib/ids.ts";
import type { Proposition } from "../../lib/types.ts";
import { findPredecessorSeed } from "../test-utils.ts";

let predecessor: Proposition;
let predecessorDashId: string;

test.beforeAll(async () => {
  const propositions = await loadPropositions();
  predecessor = findPredecessorSeed(propositions);
  predecessorDashId = encodePropositionId(predecessor.propositionId);
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
  await expect(page.getByRole("heading", { name: "증거 스냅샷 탐색" })).toBeVisible();

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
