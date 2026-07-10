import type { Proposition } from "./types.ts";

type FactualLeadCert = Pick<Proposition, "claimNature" | "sixW">;

export function buildFactualLead(
  cert: FactualLeadCert
): { lead: string; howSentence: string | null } | null {
  const sixW = cert.sixW;

  if (
    !sixW ||
    !sixW.who.trim() ||
    !sixW.when.trim() ||
    !sixW.where.trim() ||
    !sixW.what.trim() ||
    !sixW.how.trim()
  ) {
    return null;
  }

  const when = firstSegment(sixW.when);
  const where = firstSegment(sixW.where);
  const particle = subjectParticle(sixW.who);
  // 사건형 리드에 who를 넣지 않는다: what 슬롯은 자체 주어를 가진 완결 서술이라
  // "{who}가 {what}" 조립이 이중주어 비문을 만든다. who는 하층 육하 표에 보존된다.
  // 리드의 what은 괄호 상세를 제거해 문장 흐름을 살린다 — 전문은 하층 육하 표에 남는다.
  const what = withoutParentheticals(sixW.what);
  const lead =
    cert.claimNature === "event_occurrence"
      ? withPeriod(`${when}, ${where}에서 ${what}`)
      : cert.claimNature === "document_content"
        ? withPeriod(`${when} ${sixW.who}${particle} 남긴 기록 — ${what}`)
        : withPeriod(`${when} ${sixW.who}${particle} 측정·집계한 결과 — ${what}`);

  return {
    lead,
    howSentence: withPeriod(sixW.how)
  };
}

function withoutParentheticals(value: string): string {
  let result = value;

  // 중첩 괄호를 안쪽부터 반복 제거한다. 결과의 잔여 공백·구두점만 정리하며
  // 텍스트 자체는 변형하지 않는다 (무해석 원칙).
  while (/\([^()]*\)/.test(result)) {
    result = result.replace(/\([^()]*\)/g, "");
  }

  return result
    .replace(/\s+([,.])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function firstSegment(value: string): string {
  const segmentEnd = [value.indexOf("("), value.indexOf(" — "), value.indexOf(", ")]
    .filter((index) => index >= 0)
    .reduce((earliest, index) => Math.min(earliest, index), value.length);

  return value.slice(0, segmentEnd);
}

function subjectParticle(value: string): "이" | "가" {
  const lastCharacter = value.trimEnd().at(-1);

  if (!lastCharacter) {
    return "가";
  }

  const code = lastCharacter.charCodeAt(0);

  if (code < 0xac00 || code > 0xd7a3) {
    return "가";
  }

  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

function withPeriod(value: string): string {
  return value.endsWith(".") ? value : `${value}.`;
}
