import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { CertV2Schema, InstitutionalMetricsSchema } from "../schema/cert-v2.ts";
import type { InstitutionalMetrics, Proposition } from "./types.ts";

const defaultPropositionDir = join(process.cwd(), "data", "propositions");
const defaultMetricsPath = join(process.cwd(), "data", "institutional-metrics.json");

export async function listPropositionFiles(dataDir = defaultPropositionDir): Promise<string[]> {
  const entries = await readdir(dataDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(dataDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

export async function loadPropositionFile(path: string): Promise<Proposition> {
  const raw = await readFile(path, "utf8");
  return CertV2Schema.parse(JSON.parse(raw));
}

export async function loadPropositions(dataDir = defaultPropositionDir): Promise<Proposition[]> {
  const files = await listPropositionFiles(dataDir);
  return Promise.all(files.map((file) => loadPropositionFile(file)));
}

export async function loadInstitutionalMetrics(
  path = defaultMetricsPath
): Promise<InstitutionalMetrics> {
  const raw = await readFile(path, "utf8");
  return InstitutionalMetricsSchema.parse(JSON.parse(raw));
}

export async function fetchApiIndex(baseUrl = "/api/v2/index.json"): Promise<unknown> {
  const response = await fetch(baseUrl);

  if (!response.ok) {
    throw new Error(`Failed to load ${baseUrl}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
