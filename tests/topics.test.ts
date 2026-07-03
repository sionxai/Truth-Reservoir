import { describe, expect, it } from "vitest";
import {
  allTopicSummaries,
  eventDateKey,
  monthBucketLabel,
  orderTopicPropositions,
  topicSummary
} from "../lib/topics.ts";
import type { Proposition } from "../lib/types.ts";

// Minimal proposition factory: only the fields the topics layer reads. The `as
// Proposition` cast keeps the test focused on date-key/order behavior.
function proposition(
  propositionId: string,
  when: string | null,
  asOfDate = "2026-01-01",
  extras: Partial<Proposition> = {}
): Proposition {
  return {
    propositionId,
    asOfDate,
    sixW: when === null ? undefined : { who: "누구", when, where: "", what: "", how: "", why: [] },
    evidence: [],
    correctionHistory: [],
    undeterminedItems: [],
    tags: [],
    ...extras
  } as unknown as Proposition;
}

describe("eventDateKey — date parsing", () => {
  it("parses a full Korean date from sixW.when", () => {
    const key = eventDateKey(proposition("stmt:a00000000000000000000000", "2026년 6월 3일"));
    expect(key).toMatchObject({
      sortable: "2026-06-03",
      year: 2026,
      month: 6,
      day: 3,
      known: true,
      source: "when"
    });
  });

  it("parses an ISO date token from sixW.when", () => {
    const key = eventDateKey(proposition("stmt:a00000000000000000000000", "2011-03-29 공포"));
    expect(key.sortable).toBe("2011-03-29");
    expect(key.source).toBe("when");
  });

  it("parses year-only and month-only Korean dates, padding day/month to 01", () => {
    const yearOnly = eventDateKey(proposition("stmt:a00000000000000000000000", "2022년"));
    expect(yearOnly).toMatchObject({ sortable: "2022-01-01", year: 2022, month: null, day: null });

    const monthOnly = eventDateKey(proposition("stmt:a00000000000000000000000", "2025년 12월"));
    expect(monthOnly).toMatchObject({ sortable: "2025-12-01", year: 2025, month: 12, day: null });
  });

  it("extracts the EARLIEST date when sixW.when contains several", () => {
    // "2018년 전자출판, 2020년 ... 수록" → earliest is 2018.
    const key = eventDateKey(
      proposition(
        "stmt:a00000000000000000000000",
        "2018년 전자출판, 2020년 Journal of Homosexuality 권호 수록"
      )
    );
    expect(key.sortable).toBe("2018-01-01");

    const mixed = eventDateKey(
      proposition("stmt:a00000000000000000000000", "2026년 6월 3일(사태 발생), 6월 5~9일(집계 정정)")
    );
    expect(mixed.sortable).toBe("2026-06-03");
  });

  it("falls back to asOfDate when sixW.when begins with 불명 (헌법 제7)", () => {
    const key = eventDateKey(
      proposition(
        "stmt:a00000000000000000000000",
        "불명(개정 사무편람의 정확한 개정일은 기록에 없음)",
        "2026-06-18"
      )
    );
    expect(key.sortable).toBe("2026-06-18");
    expect(key.source).toBe("asOfDate");
  });

  it("ignores parenthetical dates inside a 불명 when and uses asOfDate", () => {
    // A 불명 whose parenthetical mentions 2025년 11월 must NOT sort by that inner date.
    const key = eventDateKey(
      proposition(
        "stmt:a00000000000000000000000",
        "불명(문서가 적은 회의 기간은 2025년 11월 10~25일)",
        "2026-06-16"
      )
    );
    expect(key.source).toBe("asOfDate");
    expect(key.sortable).toBe("2026-06-16");
  });

  it("falls back to asOfDate when sixW is absent", () => {
    const key = eventDateKey(proposition("stmt:a00000000000000000000000", null, "2026-05-04"));
    expect(key).toMatchObject({ sortable: "2026-05-04", source: "asOfDate", known: true });
  });

  it("falls back to asOfDate when sixW.when has no parseable date (기원전 등)", () => {
    const key = eventDateKey(
      proposition("stmt:a00000000000000000000000", "기원전 약 240년경", "2026-06-16")
    );
    expect(key.source).toBe("asOfDate");
    expect(key.sortable).toBe("2026-06-16");
  });

  it("sorts to the END when neither sixW.when nor asOfDate parses", () => {
    const key = eventDateKey(
      proposition("stmt:a00000000000000000000000", "기원전 약 240년경", "알 수 없음")
    );
    expect(key.known).toBe(false);
    expect(key.source).toBe("none");
    expect(key.sortable).toBe("9999-99-99");
  });

  it("rejects out-of-range month/day tokens", () => {
    // 2026-13-40 is not a valid date → not extracted; falls back to asOfDate.
    const key = eventDateKey(
      proposition("stmt:a00000000000000000000000", "2026-13-40 오류", "2026-02-02")
    );
    expect(key.source).toBe("asOfDate");
    expect(key.sortable).toBe("2026-02-02");
  });
});

describe("orderTopicPropositions — deterministic order (제14)", () => {
  it("orders chronologically by event date", () => {
    const props = [
      proposition("stmt:c00000000000000000000000", "2026년 6월 9일"),
      proposition("stmt:a00000000000000000000000", "2025년 12월"),
      proposition("stmt:b00000000000000000000000", "2026년 6월 3일")
    ];

    expect(orderTopicPropositions(props).map((p) => p.propositionId)).toEqual([
      "stmt:a00000000000000000000000",
      "stmt:b00000000000000000000000",
      "stmt:c00000000000000000000000"
    ]);
  });

  it("sorts date-unknown propositions to the END", () => {
    const dated = proposition("stmt:a00000000000000000000000", "2026년 6월 3일");
    const unknown = proposition("stmt:z00000000000000000000000", "불명", "알 수 없음");

    expect(orderTopicPropositions([unknown, dated]).map((p) => p.propositionId)).toEqual([
      "stmt:a00000000000000000000000",
      "stmt:z00000000000000000000000"
    ]);
  });

  it("breaks ties by propositionId ascending (stable, non-editorial)", () => {
    // Same event date → propositionId asc decides.
    const props = [
      proposition("stmt:c00000000000000000000000", "2026년 6월 3일"),
      proposition("stmt:a00000000000000000000000", "2026년 6월 3일"),
      proposition("stmt:b00000000000000000000000", "2026년 6월 3일")
    ];

    expect(orderTopicPropositions(props).map((p) => p.propositionId)).toEqual([
      "stmt:a00000000000000000000000",
      "stmt:b00000000000000000000000",
      "stmt:c00000000000000000000000"
    ]);
  });

  it("breaks ties among date-unknown propositions by propositionId ascending", () => {
    const props = [
      proposition("stmt:y00000000000000000000000", "불명", "x"),
      proposition("stmt:x00000000000000000000000", "불명", "x")
    ];

    expect(orderTopicPropositions(props).map((p) => p.propositionId)).toEqual([
      "stmt:x00000000000000000000000",
      "stmt:y00000000000000000000000"
    ]);
  });

  it("does not mutate the input array", () => {
    const props = [
      proposition("stmt:c00000000000000000000000", "2026년 6월 9일"),
      proposition("stmt:a00000000000000000000000", "2025년 12월")
    ];
    const originalOrder = props.map((p) => p.propositionId);
    orderTopicPropositions(props);
    expect(props.map((p) => p.propositionId)).toEqual(originalOrder);
  });
});

describe("monthBucketLabel — neutral auto-derived subheadings", () => {
  it("returns a YYYY년 M월 label for a known month", () => {
    const key = eventDateKey(proposition("stmt:a00000000000000000000000", "2026년 6월 3일"));
    expect(monthBucketLabel(key)).toBe("2026년 6월");
  });

  it("returns null when the month is unknown (year-only date)", () => {
    const key = eventDateKey(proposition("stmt:a00000000000000000000000", "2022년"));
    expect(monthBucketLabel(key)).toBeNull();
  });

  it("returns null when the date is unknown", () => {
    const key = eventDateKey(proposition("stmt:a00000000000000000000000", "불명", "x"));
    expect(monthBucketLabel(key)).toBeNull();
  });
});

describe("topicSummary / allTopicSummaries", () => {
  it("builds an ordered summary with dateRange over KNOWN dates only", () => {
    const props = [
      proposition("stmt:c00000000000000000000000", "2026년 6월 9일", "2026-06-18", {
        tags: ["선거"],
        evidence: [{ url: "https://a.example/1" }, { url: "https://a.example/2" }]
      } as Partial<Proposition>),
      proposition("stmt:a00000000000000000000000", "2025년 12월", "2026-06-18", {
        tags: ["선거"],
        evidence: [{ url: "https://b.example/1" }]
      } as Partial<Proposition>),
      proposition("stmt:z00000000000000000000000", "불명", "알 수 없음", {
        tags: ["선거"],
        evidence: [{ url: "https://c.example/1" }]
      } as Partial<Proposition>)
    ];

    const summary = topicSummary("선거", props);
    expect(summary.tag).toBe("선거");
    expect(summary.path).toBe("/t/%EC%84%A0%EA%B1%B0");
    expect(summary.count).toBe(3);
    // 2 + 1 + 1 unique source URLs.
    expect(summary.sourceTotal).toBe(4);
    expect(summary.propositionIds).toEqual([
      "stmt:a00000000000000000000000",
      "stmt:c00000000000000000000000",
      "stmt:z00000000000000000000000"
    ]);
    expect(summary.dateRange).toEqual({ from: "2025-12-01", to: "2026-06-09" });
  });

  it("covers every unique tag exactly once", () => {
    const props = [
      proposition("stmt:a00000000000000000000000", "2026년 1월 1일", "2026-01-01", {
        tags: ["x", "y"]
      } as Partial<Proposition>),
      proposition("stmt:b00000000000000000000000", "2026년 2월 1일", "2026-02-01", {
        tags: ["y"]
      } as Partial<Proposition>)
    ];

    const summaries = allTopicSummaries(props);
    expect(summaries.map((s) => s.tag).sort()).toEqual(["x", "y"]);
    const y = summaries.find((s) => s.tag === "y");
    expect(y?.count).toBe(2);
  });
});
