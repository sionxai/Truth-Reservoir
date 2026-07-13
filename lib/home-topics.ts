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
  "민감주제",
  // generic 카테고리 태그 — 서사 주제가 아니라 분류축이므로 주제 타일에서 제외한다.
  "국제사건",
  "국내영향"
]);

// 완성(published) 주제 — 의도적으로 기사로 정리한 대표 주제만 홈 주제 카드로 노출한다.
// 나머지 태그는 명제가 있어도 '준비중'이며, 명제는 검색·타임라인·API로 계속 접근 가능하다.
// 새 주제를 기사로 완성할 때마다 여기에 추가한다.
export const PUBLISHED_TOPICS = new Set([
  "2026지방선거",
  "러시아우크라이나전쟁"
]);

export function isPublishedTopic(tag: string): boolean {
  return PUBLISHED_TOPICS.has(tag);
}

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
