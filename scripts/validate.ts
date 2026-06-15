import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { z } from "zod";
import {
  CertV2Schema,
  InstitutionalMetricsSchema
} from "../schema/cert-v2.ts";
import { listPropositionFiles } from "../lib/data.ts";

const allowedClaimNature = new Set(["event_occurrence", "document_content"]);

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

  try {
    const raw = await readFile(file, "utf8");
    const result = InstitutionalMetricsSchema.safeParse(JSON.parse(raw));

    if (!result.success) {
      return [`${file}\n${formatZodError(result.error)}`];
    }
  } catch (error) {
    return [`${file}\n${error instanceof Error ? error.message : String(error)}`];
  }

  return [];
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
