import { describe, expect, it } from "vitest";
import { buildFactualLead } from "../lib/article.ts";
import type { Proposition } from "../lib/types.ts";

const baseSixW: NonNullable<Proposition["sixW"]> = {
  who: "홍길동",
  when: "2026년 6월 3일",
  where: "서울",
  what: "기록을 공개했다",
  how: "공식 문서로 공개했다",
  why: []
};

function cert(
  claimNature: Proposition["claimNature"],
  overrides: Partial<NonNullable<Proposition["sixW"]>> = {}
) {
  return {
    claimNature,
    sixW: { ...baseSixW, ...overrides }
  };
}

describe("buildFactualLead", () => {
  it.each([
    ["홍길동", "홍길동이"],
    ["김철수", "김철수가"],
    ["NASA", "NASA가"]
  ])("chooses the subject particle for %s", (who, expectedSubject) => {
    const result = buildFactualLead(cert("document_content", { who }));

    expect(result?.lead).toContain(expectedSubject);
  });

  it("omits who from the event lead (what carries its own subject)", () => {
    const result = buildFactualLead(cert("event_occurrence"));

    expect(result?.lead).toBe("2026년 6월 3일, 서울에서 기록을 공개했다.");
  });

  it("strips parenthetical detail from what in the lead only", () => {
    const result = buildFactualLead(
      cert("event_occurrence", {
        what: "투표용지가 부족(전국 7,194장 부족), 26곳에서 투표 일시 중단(최소 4분~최대 105분)했다"
      })
    );

    expect(result?.lead).toBe(
      "2026년 6월 3일, 서울에서 투표용지가 부족, 26곳에서 투표 일시 중단했다."
    );
  });

  it("strips nested parentheticals and keeps how untouched", () => {
    const result = buildFactualLead(
      cert("event_occurrence", {
        what: "집계를 발표(부록(표 3) 포함)했다",
        how: "공식 문서(관보)로 공개했다"
      })
    );

    expect(result?.lead).toBe("2026년 6월 3일, 서울에서 집계를 발표했다.");
    expect(result?.howSentence).toBe("공식 문서(관보)로 공개했다.");
  });

  it("shortens when at the first parenthesis for the lead only", () => {
    const result = buildFactualLead(
      cert("event_occurrence", {
        when: "2026년 6월 3일(사태 발생), 6월 5~9일(집계 정정)"
      })
    );

    expect(result?.lead).toBe("2026년 6월 3일, 서울에서 기록을 공개했다.");
  });

  it("shortens where at an em-dash separator for the lead only", () => {
    const result = buildFactualLead(
      cert("event_occurrence", {
        where: "전국 91곳 — 서울 42곳(송파 20곳)"
      })
    );

    expect(result?.lead).toBe("2026년 6월 3일, 전국 91곳에서 기록을 공개했다.");
  });

  it("does not duplicate periods already present in what and how", () => {
    const result = buildFactualLead(
      cert("document_content", {
        what: "집계 결과를 남겼다.",
        how: "원문과 대조했다."
      })
    );

    expect(result).toEqual({
      lead: "2026년 6월 3일 홍길동이 남긴 기록 — 집계 결과를 남겼다.",
      howSentence: "원문과 대조했다."
    });
  });

  it.each(["who", "when", "where", "what", "how"] as const)(
    "returns null when required slot %s is blank",
    (slot) => {
      expect(buildFactualLead(cert("event_occurrence", { [slot]: "   " }))).toBeNull();
    }
  );

  it("uses the document-content template without shortening what or how", () => {
    expect(buildFactualLead(cert("document_content"))).toEqual({
      lead: "2026년 6월 3일 홍길동이 남긴 기록 — 기록을 공개했다.",
      howSentence: "공식 문서로 공개했다."
    });
  });

  it("uses the measurement template", () => {
    expect(buildFactualLead(cert("measurement"))).toEqual({
      lead: "2026년 6월 3일 홍길동이 측정·집계한 결과 — 기록을 공개했다.",
      howSentence: "공식 문서로 공개했다."
    });
  });
});
