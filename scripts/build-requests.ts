import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { getRepoSlug } from "../lib/site.ts";

const outputPath = "public/api/v2/requests.json";
const requestLaneNote =
  "Each request is a DEMAND, NOT a fact; requests are public, append-only demands via GitHub, not stored facts (제2, 제8). Fulfillment requires normal verification and human sign-off (제11). Unverifiable requests are recorded honestly as declined or undetermined (제7). Demand is one public, transparent input to selection (제14).";
const unavailableNote = `${requestLaneNote} The GitHub request mirror was unavailable during this build, so the static queue was generated empty without failing the export.`;
const fulfilledPattern = /^\s*fulfilled:\s*(stmt:[A-Za-z0-9._:-]+)\s*$/im;
const recentClosedWindowMs = 30 * 24 * 60 * 60 * 1000;

type ClaimNatureGuess = "event_occurrence" | "document_content" | "measurement" | "unknown";

type GitHubIssue = {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  comments: number;
  comments_url: string;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
};

type GitHubComment = {
  body: string | null;
};

type FactRequest = {
  id: number;
  title: string;
  topic: string;
  why: string;
  claimNatureGuess: ClaimNatureGuess;
  candidateSources: string[];
  state: "open" | "closed";
  fulfilledPropositionId: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
};

type RequestsMirror = {
  meta: {
    generatedAt: string;
    repo: string;
    total: number;
    note: string;
  };
  requests: FactRequest[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function emptyMirror(repo: string, note = requestLaneNote): RequestsMirror {
  return {
    meta: {
      generatedAt: nowIso(),
      repo,
      total: 0,
      note
    },
    requests: []
  };
}

async function writeMirror(mirror: RequestsMirror): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(mirror, null, 2)}\n`);
}

function apiUrl(repo: string, path: string): string {
  return `https://api.github.com/repos/${repo}${path}`;
}

async function fetchGithubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "truth-reservoir-static-request-mirror"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanField(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed || /^_No response_$/i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function issueFormField(body: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const match = body.match(
      new RegExp(`^###\\s+${escapeRegExp(label)}\\s*\\n+([\\s\\S]*?)(?=\\n###\\s+|\\s*$)`, "im")
    );
    const value = cleanField(match?.[1]);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function titleToTopic(title: string): string {
  return title.replace(/^\[Fact request\]\s*/i, "").trim() || title.trim();
}

function claimNatureGuess(value: string | undefined): ClaimNatureGuess {
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

function candidateSources(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

async function issueComments(issue: GitHubIssue): Promise<GitHubComment[]> {
  if (!issue.comments) {
    return [];
  }

  return fetchGithubJson<GitHubComment[]>(`${issue.comments_url}?per_page=100`);
}

function fulfilledPropositionId(texts: Array<string | null>): string | null {
  for (const text of texts) {
    const match = text?.match(fulfilledPattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function shouldInclude(issue: GitHubIssue, fulfilledId: string | null): boolean {
  if (issue.state === "open") {
    return true;
  }

  const updatedAt = Date.parse(issue.updated_at);

  return Boolean(
    fulfilledId &&
      Number.isFinite(updatedAt) &&
      Date.now() - updatedAt <= recentClosedWindowMs
  );
}

async function toFactRequest(issue: GitHubIssue): Promise<FactRequest | null> {
  const comments = await issueComments(issue);
  const body = issue.body ?? "";
  const fulfilledId = fulfilledPropositionId([
    body,
    ...comments.map((comment) => comment.body)
  ]);

  if (!shouldInclude(issue, fulfilledId)) {
    return null;
  }

  const topic = issueFormField(body, ["Requested fact/topic", "Requested fact", "Topic"]) ??
    titleToTopic(issue.title);
  const why = issueFormField(body, ["Why it's needed", "Why it is needed", "Why"]) ?? "";
  const guess = claimNatureGuess(
    issueFormField(body, ["ClaimNature guess", "claimNatureGuess", "Claim nature guess"])
  );
  const sources = candidateSources(
    issueFormField(body, ["Candidate sources", "Candidate Sources"])
  );

  return {
    id: issue.number,
    title: issue.title,
    topic,
    why,
    claimNatureGuess: guess,
    candidateSources: sources,
    state: issue.state,
    fulfilledPropositionId: fulfilledId,
    url: issue.html_url,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at
  };
}

async function fetchFactRequests(repo: string): Promise<FactRequest[]> {
  const issues = await fetchGithubJson<GitHubIssue[]>(
    apiUrl(repo, "/issues?labels=fact-request&state=all&sort=updated&direction=desc&per_page=100")
  );
  const requests = await Promise.all(
    issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => toFactRequest(issue))
  );

  return requests
    .filter((request): request is FactRequest => Boolean(request))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function buildRequestsMirror(): Promise<RequestsMirror> {
  let repo = "sionxai/Truth-Reservoir";

  try {
    repo = getRepoSlug();
    const requests = await fetchFactRequests(repo);
    const mirror = {
      meta: {
        generatedAt: nowIso(),
        repo,
        total: requests.length,
        note: requestLaneNote
      },
      requests
    };

    await writeMirror(mirror);
    console.log(`Wrote ${outputPath} with ${requests.length} request(s).`);

    return mirror;
  } catch (error) {
    const mirror = emptyMirror(repo, unavailableNote);
    await writeMirror(mirror);
    console.warn(
      `Wrote empty ${outputPath}; GitHub request mirror unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    return mirror;
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];

  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isDirectRun()) {
  await buildRequestsMirror();
}
