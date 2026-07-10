import { tagRoute } from "./propositions.ts";
import { eventDateKey } from "./topics.ts";
import type { Proposition } from "./types.ts";

export const HERO_TOPIC_COUNT = 6;

export const FACET_TAGS = new Set([
  "측정",
  "정치주장",
  "사건단위",
  "주장",
  "문서내용",
  "최근1년",
  "민감주제"
]);

const PURE_YEAR_TAG = /^\d{4}$/;

export interface HomeTopicTile {
  tag: string;
  path: string;
  count: number;
  dateRange: { from: string | null; to: string | null };
  latestDate: string;
  lastUpdated: string;
}

export function isEligibleTopicTag(tag: string): boolean {
  return !FACET_TAGS.has(tag) && !PURE_YEAR_TAG.test(tag);
}

export function eligibleTopicTags(proposition: Proposition): string[] {
  return proposition.tags.filter(isEligibleTopicTag);
}

export function eligibleTagCounts(propositions: Proposition[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const proposition of propositions) {
    for (const tag of eligibleTopicTags(proposition)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return counts;
}

export function primaryTopicTag(
  proposition: Proposition,
  globalCounts: ReadonlyMap<string, number>
): string | null {
  const tags = eligibleTopicTags(proposition);

  if (tags.length === 0) {
    return null;
  }

  return [...tags].sort((left, right) => {
    const countDelta = (globalCounts.get(right) ?? 0) - (globalCounts.get(left) ?? 0);

    if (countDelta !== 0) {
      return countDelta;
    }

    return left.localeCompare(right, "ko");
  })[0];
}

export function topicTiles(propositions: Proposition[]): HomeTopicTile[] {
  const counts = eligibleTagCounts(propositions);
  const groups = new Map<string, Proposition[]>();

  for (const proposition of propositions) {
    const tag = primaryTopicTag(proposition, counts);

    if (!tag) {
      continue;
    }

    const group = groups.get(tag) ?? [];
    group.push(proposition);
    groups.set(tag, group);
  }

  return [...groups.entries()]
    .map(([tag, group]) => {
      const knownDates = group
        .map((proposition) => eventDateKey(proposition))
        .filter((key) => key.known)
        .map((key) => key.sortable)
        .sort((left, right) => left.localeCompare(right));
      const lastUpdated = group.reduce(
        (latest, proposition) =>
          proposition.updatedAt > latest ? proposition.updatedAt : latest,
        ""
      );

      return {
        tag,
        path: tagRoute(tag),
        count: group.length,
        dateRange: {
          from: knownDates[0] ?? null,
          to: knownDates[knownDates.length - 1] ?? null
        },
        latestDate: knownDates[knownDates.length - 1] ?? "0000-00-00",
        lastUpdated
      };
    })
    .sort((left, right) => {
      const countDelta = right.count - left.count;

      if (countDelta !== 0) {
        return countDelta;
      }

      const latestDateDelta = right.latestDate.localeCompare(left.latestDate);

      if (latestDateDelta !== 0) {
        return latestDateDelta;
      }

      return left.tag.localeCompare(right.tag, "ko");
    });
}
