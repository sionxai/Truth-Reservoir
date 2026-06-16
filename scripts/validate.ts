import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { z } from "zod";
import {
  CertV2Schema,
  InstitutionalMetricsSchema
} from "../schema/cert-v2.ts";
import { listPropositionFiles, loadPropositions } from "../lib/data.ts";

const allowedClaimNature = new Set(["event_occurrence", "document_content", "measurement"]);

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

async function validatePropositions(): Promise<string[]> {
  const errors: string[] = [];
  const files = await listPropositionFiles();

  for (const file of files) {
    try {
      const raw = await readFile(file, "utf8");
      const parsedJson = JSON.parse(raw) as unknown;
      const result = CertV2Schema.safeParse(parsedJson);

      if (!result.success) {
        errors.push(`${file}\n${formatZodError(result.error)}`);
        continue;
      }

      if (!allowedClaimNature.has(result.data.claimNature)) {
        errors.push(`${file}\nclaimNature: unsupported value "${result.data.claimNature}"`);
      }
    } catch (error) {
      errors.push(`${file}\n${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return errors;
}

async function validateInstitutionalMetrics(): Promise<string[]> {
  const file = "data/institutional-metrics.json";

  let metrics;
  try {
    const raw = await readFile(file, "utf8");
    const result = InstitutionalMetricsSchema.safeParse(JSON.parse(raw));

    if (!result.success) {
      return [`${file}\n${formatZodError(result.error)}`];
    }
    metrics = result.data;
  } catch (error) {
    return [`${file}\n${error instanceof Error ? error.message : String(error)}`];
  }

  // Cross-check the aggregate counts against the actual propositions so the
  // metrics can't silently drift. Enforces the rule that undetermined entries
  // are NOT folded into totalAssessed. If propositions don't parse, the
  // proposition validator already reports it — skip the cross-check then.
  let propositions;
  try {
    propositions = await loadPropositions();
  } catch {
    return [];
  }

  const expected = {
    totalEntries: propositions.length,
    totalAssessed: propositions.filter((p) => p.assessment.status === "assessed").length,
    totalUndetermined: propositions.filter((p) => p.assessment.status === "undetermined").length,
    totalRetracted: propositions.filter((p) => p.status === "retracted").length,
    openCorrectionRequests: propositions.reduce((sum, p) => sum + p.openCorrectionRequests, 0)
  };

  const mismatches: string[] = [];
  if (metrics.totalEntries !== expected.totalEntries) {
    mismatches.push(`totalEntries: expected ${expected.totalEntries}, found ${metrics.totalEntries}`);
  }
  if (metrics.totalAssessed !== expected.totalAssessed) {
    mismatches.push(`totalAssessed: expected ${expected.totalAssessed}, found ${metrics.totalAssessed}`);
  }
  if (metrics.totalUndetermined !== expected.totalUndetermined) {
    mismatches.push(
      `totalUndetermined: expected ${expected.totalUndetermined}, found ${metrics.totalUndetermined}`
    );
  }
  if (metrics.totalRetracted !== expected.totalRetracted) {
    mismatches.push(
      `totalRetracted: expected ${expected.totalRetracted}, found ${metrics.totalRetracted}`
    );
  }
  if (metrics.correctionMetrics.openCorrectionRequests !== expected.openCorrectionRequests) {
    mismatches.push(
      `correctionMetrics.openCorrectionRequests: expected sum-of-propositions ` +
        `${expected.openCorrectionRequests}, found ${metrics.correctionMetrics.openCorrectionRequests}`
    );
  }
  // latencyStatus must agree with the median sample (no "fast" from an empty sample).
  if (metrics.correctionMetrics.medianCorrectionLatencyDays === null &&
      metrics.correctionMetrics.latencyStatus !== "no_requests_yet") {
    mismatches.push(`correctionMetrics.latencyStatus: must be "no_requests_yet" when median is null`);
  }

  return mismatches.length ? [`${file}\n${mismatches.join("\n")}`] : [];
}

const errors = [...(await validatePropositions()), ...(await validateInstitutionalMetrics())];

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} file error(s):`);
  for (const error of errors) {
    console.error(`\n${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${basename("data/propositions")} and institutional metrics with 0 errors.`);
