import type { Assessment, ClaimNature, Classification, Grade, Proposition } from "./types.ts";

export const gradeOptions: Grade[] = [
  "fully_reliable",
  "largely_reliable",
  "mixed",
  "largely_unreliable",
  "not_reliable"
];

export const gradeLabels: Record<Grade, string> = {
  fully_reliable: "신뢰",
  largely_reliable: "대체로 신뢰",
  mixed: "혼재",
  largely_unreliable: "대체로 신뢰 어려움",
  not_reliable: "신뢰 어려움"
};

export const classificationLabels: Record<Classification, string> = {
  F: "F 분류",
  O: "O 분류",
  M: "M 분류"
};

export const claimNatureLabels: Record<ClaimNature, string> = {
  event_occurrence: "사건",
  document_content: "문서",
  measurement: "측정"
};

export const assessmentStatusLabels: Record<Assessment["status"], string> = {
  assessed: "라벨 산정",
  undetermined: "판단유보"
};

export const legalStatusLabels: Record<Proposition["sensitive"]["legalStatus"], string> = {
  final_judgment: "확정 판단",
  pending: "진행 중",
  allegation: "주장 단계",
  official_record: "공식 기록",
  unknown: "미확인",
  not_applicable: "해당 없음"
};

export const reviewModeLabels: Record<Proposition["reviewMode"], string> = {
  human_reviewed: "인간검수",
  automated_unreviewed: "자동처리"
};

export function gradeLabel(grade: Grade | null): string {
  return grade ? gradeLabels[grade] : "판단유보";
}

export function gradeTone(grade: Grade | null): "success" | "primary" | "warning" | "danger" | "muted" {
  switch (grade) {
    case "fully_reliable":
      return "success";
    case "largely_reliable":
      return "primary";
    case "mixed":
      return "warning";
    case "largely_unreliable":
    case "not_reliable":
      return "danger";
    default:
      return "muted";
  }
}

export function formatDateTime(value: string): string {
  return value.replace("T", " ").replace("Z", " UTC");
}

export function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "호스트 미확인";
  }
}
