#!/usr/bin/env -S node --import tsx
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { sha256Prefixed } from "../../lib/hash.ts";
import { getRepoUrl } from "../../lib/site.ts";
import { deriveHashes } from "../../lib/verify.ts";
import type { InstitutionalMetrics, Proposition } from "../../lib/types.ts";

export const defaultBaseUrl = "https://truth-reservoir.vercel.app";

const evidenceGuidance =
  "Cite the evidence network, provenance, quoteHash comparisons, locators/archiveStatus, and reviewLog. Do not cite the grade label as the conclusion; factualGrade is only a secondary navigation signal. Truth Reservoir stores facts, not verdicts.";
const requestLaneGuidance =
  "A request is a DEMAND, NOT a fact. It is never stored as a verified proposition (제2). Fulfillment goes through the normal verification pipeline and human sign-off (제11). Unverifiable requests are recorded honestly as declined or undetermined (제7). The request queue is public and append-only via GitHub (제8). Demand is one public, transparent input to selection (제14).";

type JsonRecord = Record<string, unknown>;

type ApiIndex = {
  data: Proposition[];
  meta?: {
    propositions?: Array<{
      propositionId: string;
      path: string;
    }>;
  };
};

type RequestsMirror = {
  meta?: JsonRecord;
  requests?: JsonRecord[];
};

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonRecord;
  handler: (args: JsonRecord, baseUrl: string) => Promise<unknown>;
};

const emptyInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false
};

const searchInputSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Case-insensitive text search over canonicalProposition, originalClaim, and tags."
    },
    claimNature: {
      type: "string",
      enum: ["event_occurrence", "document_content", "measurement"]
    },
    factualGrade: {
      type: "string",
      enum: [
        "fully_reliable",
        "largely_reliable",
        "mixed",
        "largely_unreliable",
        "not_reliable"
      ],
      description: "Secondary navigation filter only; do not cite it as the conclusion."
    },
    status: {
      type: "string",
      enum: ["active", "superseded", "retracted", "needs_review"]
    },
    classification: {
      type: "string",
      enum: ["F", "O", "M"]
    },
    tag: {
      type: "string"
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 50,
      default: 20
    }
  },
  additionalProperties: false
};

const propositionIdInputSchema = {
  type: "object",
  properties: {
    propositionId: {
      type: "string",
      description: "Accepts either stmt:... or dash-encoded stmt-... form."
    }
  },
  required: ["propositionId"],
  additionalProperties: false
};

const tagInputSchema = {
  type: "object",
  properties: {
    tag: {
      type: "string"
    }
  },
  required: ["tag"],
  additionalProperties: false
};

const requestFactInputSchema = {
  type: "object",
  properties: {
    topic: {
      type: "string",
      description:
        "Missing fact-data to request for verification. This is demand, not a stored fact."
    },
    why: {
      type: "string",
      description: "Optional reason this fact-data is needed."
    },
    claimNatureGuess: {
      type: "string",
      enum: ["event_occurrence", "document_content", "measurement", "unknown"],
      default: "unknown",
      description: "Best-effort classification guess only; verification may classify it differently."
    },
    candidateSources: {
      type: "array",
      items: {
        type: "string"
      },
      description: "Optional candidate URLs, document names, page references, or archives."
    }
  },
  required: ["topic"],
  additionalProperties: false
};

function baseUrlFromEnv(): string {
  return (process.env.TRUTH_RESERVOIR_BASE_URL ?? defaultBaseUrl).replace(/\/+$/, "");
}

function apiUrl(path: string, baseUrl = baseUrlFromEnv()): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl.replace(/\/+$/, "")}${normalizedPath}`;
}

async function fetchJson<T>(path: string, baseUrl: string): Promise<T> {
  const url = apiUrl(path, baseUrl);
  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 300)}` : ""}`);
  }

  return response.json() as Promise<T>;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function optionalString(args: JsonRecord, key: string): string | undefined {
  const value = args[key];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalStringArray(args: JsonRecord, key: string): string[] {
  const value = args[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function requiredString(args: JsonRecord, key: string): string {
  const value = optionalString(args, key);

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function limitFromArgs(args: JsonRecord): number {
  const value = args.limit;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(50, Math.max(1, Math.trunc(value)));
  }

  return 20;
}

export function toDashId(propositionId: string): string {
  return propositionId.startsWith("stmt:")
    ? propositionId.replace("stmt:", "stmt-")
    : propositionId;
}

export function toColonId(propositionId: string): string {
  return propositionId.startsWith("stmt-")
    ? propositionId.replace("stmt-", "stmt:")
    : propositionId;
}

async function fetchIndex(baseUrl: string): Promise<ApiIndex> {
  const index = await fetchJson<ApiIndex>("/api/v2/index.json", baseUrl);

  if (!Array.isArray(index.data)) {
    throw new Error("Unexpected index shape: data must be an array");
  }

  return index;
}

async function fetchProposition(propositionId: string, baseUrl: string): Promise<Proposition> {
  return fetchJson<Proposition>(`/api/v2/propositions/${toDashId(propositionId)}.json`, baseUrl);
}

function pathMap(index: ApiIndex): Map<string, string> {
  return new Map(
    (index.meta?.propositions ?? []).map((entry) => [entry.propositionId, entry.path])
  );
}

function compactSummary(proposition: Proposition, publishedPath?: string) {
  return {
    propositionId: proposition.propositionId,
    canonicalProposition: proposition.canonicalProposition,
    claimNature: proposition.claimNature,
    factualGrade: proposition.assessment.factualGrade,
    status: proposition.status,
    tags: proposition.tags,
    path: publishedPath ?? `/api/v2/propositions/${toDashId(proposition.propositionId)}.json`
  };
}

export async function searchPropositions(args: JsonRecord, baseUrl = baseUrlFromEnv()) {
  const index = await fetchIndex(baseUrl);
  const paths = pathMap(index);
  const query = optionalString(args, "query")?.toLocaleLowerCase();
  const claimNature = optionalString(args, "claimNature");
  const factualGrade = optionalString(args, "factualGrade");
  const status = optionalString(args, "status");
  const classification = optionalString(args, "classification");
  const tag = optionalString(args, "tag")?.toLocaleLowerCase();
  const limit = limitFromArgs(args);

  const matches = index.data.filter((proposition) => {
    if (claimNature && proposition.claimNature !== claimNature) {
      return false;
    }

    if (factualGrade && proposition.assessment.factualGrade !== factualGrade) {
      return false;
    }

    if (status && proposition.status !== status) {
      return false;
    }

    if (classification && proposition.classification !== classification) {
      return false;
    }

    if (tag && !proposition.tags.some((item) => item.toLocaleLowerCase() === tag)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      proposition.canonicalProposition,
      proposition.originalClaim ?? "",
      proposition.tags.join(" ")
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(query);
  });

  return {
    guidance: evidenceGuidance,
    totalMatched: matches.length,
    returned: Math.min(limit, matches.length),
    data: matches
      .slice(0, limit)
      .map((proposition) => compactSummary(proposition, paths.get(proposition.propositionId)))
  };
}

export async function getProposition(args: JsonRecord, baseUrl = baseUrlFromEnv()) {
  return fetchProposition(requiredString(args, "propositionId"), baseUrl);
}

export async function verifyProposition(args: JsonRecord, baseUrl = baseUrlFromEnv()) {
  const inputPropositionId = requiredString(args, "propositionId");
  const cert = await fetchProposition(inputPropositionId, baseUrl);
  const derived = await deriveHashes(cert);
  const evidenceQuoteChecks = await Promise.all(
    cert.evidence.map(async (evidence, evidenceIndex) => {
      const expected = await sha256Prefixed(evidence.shortQuote);
      const actual = evidence.quoteHash;

      return {
        path: `evidence[${evidenceIndex}].quoteHash`,
        expected,
        actual,
        match: expected === actual
      };
    })
  );

  const fields = [
    {
      path: "propositionId",
      expected: derived.propositionId,
      actual: cert.propositionId,
      match: derived.propositionId === cert.propositionId
    },
    {
      path: "versionId",
      expected: derived.versionId,
      actual: cert.versionId,
      match: derived.versionId === cert.versionId
    },
    {
      path: "certHash",
      expected: derived.certHash,
      actual: cert.certHash,
      match: derived.certHash === cert.certHash
    },
    ...evidenceQuoteChecks
  ];

  return {
    guidance: evidenceGuidance,
    propositionId: cert.propositionId,
    inputPropositionId,
    baseUrl,
    overallMatch: fields.every((field) => field.match),
    fields,
    overclaimNotice:
      "Hash check confirms stored-snapshot integrity, not that the live source body is unchanged."
  };
}

export async function listTags(_args: JsonRecord, baseUrl = baseUrlFromEnv()) {
  const index = await fetchIndex(baseUrl);
  const counts = new Map<string, number>();

  for (const proposition of index.data) {
    for (const tag of proposition.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return {
    guidance: evidenceGuidance,
    tags: [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([tag, count]) => ({ tag, count }))
  };
}

export async function listByTag(args: JsonRecord, baseUrl = baseUrlFromEnv()) {
  const tag = requiredString(args, "tag");

  return searchPropositions({ tag, limit: 50 }, baseUrl);
}

export async function getInstitutionalMetrics(_args: JsonRecord, baseUrl = baseUrlFromEnv()) {
  const metrics = await fetchJson<InstitutionalMetrics>(
    "/api/v2/institutional-metrics.json",
    baseUrl
  );
  const { latencyStatus, medianCorrectionLatencyDays } = metrics.correctionMetrics;

  return {
    guidance:
      "Use institutional metrics as public accountability context. They do not replace proposition-level evidence network, provenance, quoteHash, or reviewLog citation.",
    metrics,
    latencyExplanation:
      medianCorrectionLatencyDays === null
        ? `medianCorrectionLatencyDays is null because latencyStatus is ${latencyStatus}; null means latency is not measured from a real correction sample and must not be read as zero-day latency.`
        : `medianCorrectionLatencyDays is measured from accepted/rejected correction samples; latencyStatus is ${latencyStatus}.`
  };
}

function requestClaimNatureGuess(args: JsonRecord): string {
  const value = optionalString(args, "claimNatureGuess");

  if (
    value === "event_occurrence" ||
    value === "document_content" ||
    value === "measurement" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function issueTitle(topic: string): string {
  const compactTopic = topic.replace(/\s+/g, " ").trim();

  return `[Fact request] ${compactTopic.slice(0, 180)}`;
}

function noResponse(value: string | undefined): string {
  return value?.trim() ? value.trim() : "_No response_";
}

function candidateSourcesBody(sources: string[]): string {
  return sources.length ? sources.map((source) => `- ${source}`).join("\n") : "_No response_";
}

function buildFactRequestBody(
  topic: string,
  why: string | undefined,
  claimNatureGuess: string,
  candidateSources: string[]
): string {
  return [
    "### Constitutional notice",
    "",
    requestLaneGuidance,
    "",
    "### Requested fact/topic",
    "",
    topic,
    "",
    "### Why it's needed",
    "",
    noResponse(why),
    "",
    "### ClaimNature guess",
    "",
    claimNatureGuess,
    "",
    "### Candidate sources",
    "",
    candidateSourcesBody(candidateSources),
    "",
    "### Requester id",
    "",
    "_No response_",
    ""
  ].join("\n");
}

export function buildFactRequestIssueUrl(args: JsonRecord): string {
  const topic = requiredString(args, "topic");
  const why = optionalString(args, "why");
  const claimNatureGuess = requestClaimNatureGuess(args);
  const candidateSources = optionalStringArray(args, "candidateSources");
  const params = new URLSearchParams({
    template: "fact-request.yml",
    title: issueTitle(topic),
    labels: "fact-request",
    body: buildFactRequestBody(topic, why, claimNatureGuess, candidateSources)
  });

  return `${getRepoUrl()}/issues/new?${params.toString()}`;
}

export async function requestFact(args: JsonRecord) {
  return {
    guidance: requestLaneGuidance,
    url: buildFactRequestIssueUrl(args),
    template: "fact-request.yml",
    labels: ["fact-request"],
    note: "Open the URL to file the public request; this requests verification and does not inject or store a fact."
  };
}

export async function listOpenRequests(_args: JsonRecord, baseUrl = baseUrlFromEnv()) {
  const mirror = await fetchJson<RequestsMirror>("/api/v2/requests.json", baseUrl);
  const requests = Array.isArray(mirror.requests)
    ? mirror.requests.filter((request) => request.state === "open")
    : [];

  return {
    guidance: requestLaneGuidance,
    meta: mirror.meta,
    totalOpen: requests.length,
    requests
  };
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "search_propositions",
    description: `Search public Cert v2.1 propositions from the live static index. ${evidenceGuidance}`,
    inputSchema: searchInputSchema,
    handler: searchPropositions
  },
  {
    name: "get_proposition",
    description: `Fetch the full public Cert v2.1 JSON for one proposition. ${evidenceGuidance}`,
    inputSchema: propositionIdInputSchema,
    handler: getProposition
  },
  {
    name: "verify_proposition",
    description: `Independently recompute evidence quoteHash values plus propositionId, versionId, and certHash using the repository derivation. This is the reproducibility check; ${evidenceGuidance}`,
    inputSchema: propositionIdInputSchema,
    handler: verifyProposition
  },
  {
    name: "list_tags",
    description: `List tags derived from the live static index. Use tags to find evidence structures, not to turn factualGrade into a conclusion. ${evidenceGuidance}`,
    inputSchema: emptyInputSchema,
    handler: listTags
  },
  {
    name: "list_by_tag",
    description: `List compact proposition summaries for a tag from the live static index. ${evidenceGuidance}`,
    inputSchema: tagInputSchema,
    handler: listByTag
  },
  {
    name: "get_institutional_metrics",
    description:
      "Fetch public institutional metrics and explain when correction latency is null versus measured. Cite proposition-level evidence network and reviewLog for factual use; metrics are accountability context.",
    inputSchema: emptyInputSchema,
    handler: getInstitutionalMetrics
  },
  {
    name: "request_fact",
    description: `Build a prefilled public GitHub fact-request Issue URL. This requests verification; it does not inject or store a fact. ${requestLaneGuidance}`,
    inputSchema: requestFactInputSchema,
    handler: requestFact
  },
  {
    name: "list_open_requests",
    description: `List open public fact-data requests from /api/v2/requests.json. Requests are demands, not verified facts; use them only as transparent demand signals. ${requestLaneGuidance}`,
    inputSchema: emptyInputSchema,
    handler: listOpenRequests
  }
];

export const toolNames = toolDefinitions.map((tool) => tool.name);

export async function handleToolCall(
  name: string,
  args: unknown = {},
  baseUrl = baseUrlFromEnv()
): Promise<unknown> {
  const tool = toolDefinitions.find((definition) => definition.name === name);

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return tool.handler(asRecord(args), baseUrl);
}

export function createTruthReservoirServer(): Server {
  const server = new Server(
    {
      name: "truth-reservoir-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions.map(({ handler: _handler, ...tool }) => tool)
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await handleToolCall(
      request.params.name,
      request.params.arguments,
      baseUrlFromEnv()
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  });

  return server;
}

async function main(): Promise<void> {
  const server = createTruthReservoirServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

function isDirectRun(): boolean {
  const entry = process.argv[1];

  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isDirectRun()) {
  await main();
}
