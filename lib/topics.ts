import { encodePropositionId } from "./ids.ts";
import { propositionsWithTag, sourceCount, tagRoute, uniqueTags } from "./propositions.ts";
import type { Proposition } from "./types.ts";

// A sortable event-date key derived purely from the date. The renderer/order layer
// must be DETERMINISTIC and NON-editorial (제14): no thematic grouping, no human
// arrangement. This key is a mechanical parse of the stored date only.
//
// key.sortable: "YYYY-MM-DD" padded so lexical order == chronological order.
//   Unknown month/day pad to "01" so they sort to the start of their period, but
//   `precision` records what was actually known (for neutral month bucketing).
// key.known: false when neither sixW.when nor asOfDate yields a parseable date; such
//   propositions sort to the END (제14 fallback), tie-broken by propositionId asc.
export interface EventDateKey {
  sortable: string;
  year: number | null;
  month: number | null;
  day: number | null;
  known: boolean;
  // Which stored field the date came from — purely informational, never rendered
  // as a claim. "when" | "asOfDate" | "none".
  source: "when" | "asOfDate" | "none";
}

const UNKNOWN_KEY: Omit<EventDateKey, "source"> = {
  // Sorts after any real YYYY-MM-DD because "9999" > any 4-digit year we store.
  sortable: "9999-99-99",
  year: null,
  month: null,
  day: null,
  known: false
};

// Matches an ISO-ish date token: 2026-06-03, 2026-06, or 2026 (as -MM/-DD optional).
const ISO_DATE = /(\d{4})-(\d{2})(?:-(\d{2}))?/g;
// Matches a Korean date token: 2026년 6월 3일 / 2026년 6월 / 2026년.
const KO_DATE = /(\d{4})\s*년(?:\s*(\d{1,2})\s*월(?:\s*(\d{1,2})\s*일)?)?/g;

interface RawDate {
  year: number;
  month: number | null;
  day: number | null;
}

function comparableString(date: RawDate): string {
  const month = date.month ?? 1;
  const day = date.day ?? 1;

  return `${String(date.year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

function isValidRawDate({ year, month, day }: RawDate): boolean {
  if (year < 1 || year > 9998) {
    return false;
  }
  if (month !== null && (month < 1 || month > 12)) {
    return false;
  }
  if (day !== null && (day < 1 || day > 31)) {
    return false;
  }

  return true;
}

// Extract every date token (ISO and Korean forms) from a free-text string and return
// the earliest one, or null when none parse. "Earliest" is by comparable string so a
// bare year (2025) precedes a same-year dated token (2025-03) — matching "the earliest
// YYYY[-MM[-DD]] found".
function earliestDateInText(text: string): RawDate | null {
  const found: RawDate[] = [];

  for (const match of text.matchAll(ISO_DATE)) {
    const candidate: RawDate = {
      year: Number(match[1]),
      month: match[2] ? Number(match[2]) : null,
      day: match[3] ? Number(match[3]) : null
    };
    if (isValidRawDate(candidate)) {
      found.push(candidate);
    }
  }

  for (const match of text.matchAll(KO_DATE)) {
    const candidate: RawDate = {
      year: Number(match[1]),
      month: match[2] ? Number(match[2]) : null,
      day: match[3] ? Number(match[3]) : null
    };
    if (isValidRawDate(candidate)) {
      found.push(candidate);
    }
  }

  if (found.length === 0) {
    return null;
  }

  return found.reduce((earliest, candidate) =>
    comparableString(candidate) < comparableString(earliest) ? candidate : earliest
  );
}

function keyFromRaw(date: RawDate, source: "when" | "asOfDate"): EventDateKey {
  return {
    sortable: comparableString(date),
    year: date.year,
    month: date.month,
    day: date.day,
    known: true,
    source
  };
}

// Derive the deterministic event-date key for one proposition (제14):
// 1. Parse the earliest date out of sixW.when. A `when` that begins with "불명"
//    (헌법 제7: honestly-unknown) is treated as having no primary date and skipped —
//    any dates in its parenthetical describe other things, not the event's own date.
// 2. Fall back to asOfDate.
// 3. If neither parses, the proposition is date-unknown and sorts to the END.
export function eventDateKey(proposition: Proposition): EventDateKey {
  const when = proposition.sixW?.when?.trim() ?? "";

  if (when && !when.startsWith("불명")) {
    const fromWhen = earliestDateInText(when);
    if (fromWhen) {
      return keyFromRaw(fromWhen, "when");
    }
  }

  const fromAsOf = earliestDateInText(proposition.asOfDate ?? "");
  if (fromAsOf) {
    return keyFromRaw(fromAsOf, "asOfDate");
  }

  return { ...UNKNOWN_KEY, source: "none" };
}

// Deterministic, non-editorial ordering (제14): chronological by eventDateKey,
// date-unknown to the END, stable tie-break by propositionId ascending.
export function orderTopicPropositions(propositions: Proposition[]): Proposition[] {
  return [...propositions].sort((left, right) => {
    const leftKey = eventDateKey(left);
    const rightKey = eventDateKey(right);

    if (leftKey.sortable !== rightKey.sortable) {
      return leftKey.sortable < rightKey.sortable ? -1 : 1;
    }

    return left.propositionId.localeCompare(right.propositionId);
  });
}

// A neutral, auto-derived "YYYY년 M월" bucket label computed purely from the date —
// NOT a thematic phase. Returns null when the date is unknown or the month is unknown,
// so no false precision is shown.
export function monthBucketLabel(key: EventDateKey): string | null {
  if (!key.known || key.year === null || key.month === null) {
    return null;
  }

  return `${key.year}년 ${key.month}월`;
}

export interface TopicSummary {
  tag: string;
  path: string;
  count: number;
  sourceTotal: number;
  dateRange: { from: string | null; to: string | null };
  propositionIds: string[];
  orderedPropositions: Proposition[];
}

// Build the derived, ordered summary for one tag. dateRange is the min/max of the
// KNOWN event dates only (unknown-date propositions do not widen the range and are
// reported as null bounds when nothing is known).
export function topicSummary(tag: string, propositions: Proposition[]): TopicSummary {
  const ordered = orderTopicPropositions(propositionsWithTag(propositions, tag));
  const knownDates = ordered
    .map((proposition) => eventDateKey(proposition))
    .filter((key) => key.known)
    .map((key) => key.sortable)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

  const sourceTotal = ordered.reduce((total, proposition) => total + sourceCount(proposition), 0);

  return {
    tag,
    path: tagRoute(tag),
    count: ordered.length,
    sourceTotal,
    dateRange: {
      from: knownDates[0] ?? null,
      to: knownDates[knownDates.length - 1] ?? null
    },
    propositionIds: ordered.map((proposition) => proposition.propositionId),
    orderedPropositions: ordered
  };
}

// All topic summaries, one per unique tag, tags in the shared deterministic order
// (uniqueTags is Korean-collated + stable). Used by the derived topics.json API.
export function allTopicSummaries(propositions: Proposition[]): TopicSummary[] {
  return uniqueTags(propositions).map((tag) => topicSummary(tag, propositions));
}

// Absolute /p/{dashId}/ path for a proposition, used by the CollectionPage JSON-LD
// hasPart array (제15/제2-safe: it lists the collection, asserts nothing about the topic).
export function topicPropositionPath(proposition: Proposition): string {
  return `/p/${encodePropositionId(proposition.propositionId)}/`;
}
