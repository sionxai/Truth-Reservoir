import { Buffer } from "node:buffer";
import type { Proposition } from "./types.ts";

export type EntityRole = "who" | "statedBy";

export interface EntityRegistryEntry {
  slug: string;
  propositionIds: string[];
  roles: Record<EntityRole, string[]>;
}

export interface PropositionEntity {
  name: string;
  slug: string;
  path: string;
  roles: EntityRole[];
}

export interface SkippedEntityCandidate {
  propositionId: string;
  role: EntityRole;
  raw: string;
  normalized: string;
  reason: "empty" | "junk_who_phrase";
}

export interface EntityTextSegment {
  text: string;
  entity?: {
    name: string;
    slug: string;
    path: string;
  };
}

const junkWhoConnectorPattern = /(^|[\s,;:·/])(및|등|중)(?=$|[\s,;:·/])/u;
// 결정론적 정크/복합 who 판별 (제14: NER 추정 아님, 구조 패턴만):
// 중점 열거(·), '과' 접속(쇼와 등 이름의 '와'는 제외), 선행 수량사, 조사가 붙은 문장조각.
const junkWhoMiddotPattern = /·/u;
const junkWhoConjunctionPattern = /[가-힣]과\s/u;
const junkWhoQuantifierPattern = /^(일부|여러|몇몇|다수|각|양)\s/u;
const junkWhoFragmentPattern = /^\S+(?:이|가|은|는|을|를)\s+\S/u;

export function normalizeEntityName(value: string): string {
  return value
    .trim()
    .replace(/(?:\s*\([^()]*\)\s*)+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function entitySlug(name: string): string {
  const encoded = Buffer.from(name, "utf8").toString("base64url");

  return `e-${encoded}`;
}

export function entityRoute(slug: string): string {
  return `/e/${slug}`;
}

export function decodeEntitySlug(slug: string): string | null {
  if (!slug.startsWith("e-")) {
    return null;
  }

  try {
    return Buffer.from(slug.slice(2), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function entityRegistry(propositions: Proposition[]): Map<string, EntityRegistryEntry> {
  const registry = new Map<
    string,
    {
      slug: string;
      propositionIds: Set<string>;
      roles: Record<EntityRole, Set<string>>;
    }
  >();

  for (const proposition of propositions) {
    for (const candidate of entityCandidates(proposition)) {
      const normalized = normalizedCandidateName(candidate.raw, candidate.role);

      if (!normalized) {
        continue;
      }

      const existing =
        registry.get(normalized) ??
        {
          slug: entitySlug(normalized),
          propositionIds: new Set<string>(),
          roles: {
            who: new Set<string>(),
            statedBy: new Set<string>()
          }
        };

      existing.propositionIds.add(proposition.propositionId);
      existing.roles[candidate.role].add(proposition.propositionId);
      registry.set(normalized, existing);
    }
  }

  const entries: Array<[string, EntityRegistryEntry]> = [...registry.entries()]
    .map(([name, entry]): [string, EntityRegistryEntry] => [
      name,
      {
        slug: entry.slug,
        propositionIds: [...entry.propositionIds].sort(),
        roles: {
          who: [...entry.roles.who].sort(),
          statedBy: [...entry.roles.statedBy].sort()
        }
      }
    ])
    .sort(([left], [right]) => left.localeCompare(right, "ko"));

  return new Map(entries);
}

export function skippedEntityCandidates(propositions: Proposition[]): SkippedEntityCandidate[] {
  const skipped: SkippedEntityCandidate[] = [];

  for (const proposition of propositions) {
    for (const candidate of entityCandidates(proposition)) {
      const normalized = normalizeEntityName(candidate.raw);

      if (!normalized) {
        skipped.push({
          propositionId: proposition.propositionId,
          role: candidate.role,
          raw: candidate.raw,
          normalized,
          reason: "empty"
        });
        continue;
      }

      if (candidate.role === "who" && isJunkWhoPhrase(normalized)) {
        skipped.push({
          propositionId: proposition.propositionId,
          role: candidate.role,
          raw: candidate.raw,
          normalized,
          reason: "junk_who_phrase"
        });
      }
    }
  }

  return skipped.sort((left, right) => {
    const proposition = left.propositionId.localeCompare(right.propositionId);
    if (proposition !== 0) {
      return proposition;
    }

    const role = left.role.localeCompare(right.role);
    if (role !== 0) {
      return role;
    }

    return left.raw.localeCompare(right.raw, "ko");
  });
}

export function entitiesForProposition(
  proposition: Proposition,
  registry: Map<string, EntityRegistryEntry>
): PropositionEntity[] {
  const entities = new Map<
    string,
    {
      slug: string;
      roles: Set<EntityRole>;
    }
  >();

  for (const candidate of entityCandidates(proposition)) {
    const name = normalizedCandidateName(candidate.raw, candidate.role);
    const entry = name ? registry.get(name) : undefined;

    if (!name || !entry) {
      continue;
    }

    const existing = entities.get(name) ?? {
      slug: entry.slug,
      roles: new Set<EntityRole>()
    };
    existing.roles.add(candidate.role);
    entities.set(name, existing);
  }

  return [...entities.entries()]
    .map(([name, entry]) => ({
      name,
      slug: entry.slug,
      path: entityRoute(entry.slug),
      roles: [...entry.roles].sort((left, right) => roleOrder(left) - roleOrder(right))
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

export function entityForRawValue(
  raw: string,
  role: EntityRole,
  registry: Map<string, EntityRegistryEntry>
): PropositionEntity | null {
  const name = normalizedCandidateName(raw, role);
  const entry = name ? registry.get(name) : undefined;

  if (!name || !entry) {
    return null;
  }

  return {
    name,
    slug: entry.slug,
    path: entityRoute(entry.slug),
    roles: [role]
  };
}

export function linkEntityNamesInText(
  text: string,
  registry: Map<string, EntityRegistryEntry>
): EntityTextSegment[] {
  const ranges: Array<{
    start: number;
    end: number;
    name: string;
    slug: string;
  }> = [];

  const names = [...registry.keys()].sort((left, right) => {
    const length = Array.from(right).length - Array.from(left).length;
    if (length !== 0) {
      return length;
    }

    return left.localeCompare(right, "ko");
  });

  for (const name of names) {
    const entry = registry.get(name);
    if (!entry) {
      continue;
    }

    const range = firstMatchRange(text, name, ranges);
    if (range) {
      ranges.push({ ...range, name, slug: entry.slug });
    }
  }

  const sortedRanges = ranges.sort((left, right) => left.start - right.start);
  const segments: EntityTextSegment[] = [];
  let cursor = 0;

  for (const range of sortedRanges) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start) });
    }

    segments.push({
      text: text.slice(range.start, range.end),
      entity: {
        name: range.name,
        slug: range.slug,
        path: entityRoute(range.slug)
      }
    });
    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments.length ? segments : [{ text }];
}

export function roleLabel(role: EntityRole): string {
  return role === "who" ? "누가" : "밝힌 주체";
}

function entityCandidates(proposition: Proposition): Array<{ raw: string; role: EntityRole }> {
  if (!proposition.sixW) {
    return [];
  }

  return [
    { raw: proposition.sixW.who, role: "who" },
    ...proposition.sixW.why.map((entry) => ({ raw: entry.statedBy, role: "statedBy" as const }))
  ];
}

function normalizedCandidateName(raw: string, role: EntityRole): string | null {
  const normalized = normalizeEntityName(raw);

  if (!normalized) {
    return null;
  }

  if (role === "who" && isJunkWhoPhrase(normalized)) {
    return null;
  }

  return normalized;
}

function isJunkWhoPhrase(normalized: string): boolean {
  return (
    Array.from(normalized).length > 25 ||
    junkWhoConnectorPattern.test(normalized) ||
    junkWhoMiddotPattern.test(normalized) ||
    junkWhoConjunctionPattern.test(normalized) ||
    junkWhoQuantifierPattern.test(normalized) ||
    junkWhoFragmentPattern.test(normalized)
  );
}

function firstMatchRange(
  text: string,
  name: string,
  existingRanges: Array<{ start: number; end: number }>
): { start: number; end: number } | null {
  let start = text.indexOf(name);

  while (start !== -1) {
    const end = start + name.length;
    const overlapsExisting = existingRanges.some(
      (range) => start < range.end && end > range.start
    );

    if (!overlapsExisting && hasSafeBoundaries(text, start, end)) {
      return { start, end };
    }

    start = text.indexOf(name, start + 1);
  }

  return null;
}

// 한국어는 조사가 명사에 붙는다("중앙선거관리위원회는"). 엔티티 뒤에 조사가 오면
// 그것은 단어 경계다 — 링크를 허용한다. 조사가 아닌 한글이 이어지면(더 긴 단어의 일부)
// 링크하지 않는다(보수적: 과소링크 > 과대링크).
const trailingJosaPattern =
  /^(으로서|으로써|으로|에서|에게서|에게|한테|께서|께|부터|까지|보다|처럼|만큼|조차|마저|이라고|라고|이라는|라는|이라도|라도|이란|란|이나|나|이든|든|이며|며|이자|자|은|는|이|가|을|를|의|에|와|과|도|로|만)/u;

function hasSafeBoundaries(text: string, start: number, end: number): boolean {
  const before = Array.from(text.slice(0, start)).at(-1);
  if (isPartialWordCharacter(before)) {
    return false;
  }

  const rest = text.slice(end);
  const after = Array.from(rest)[0];
  if (!isPartialWordCharacter(after)) {
    return true;
  }

  return trailingJosaPattern.test(rest);
}

function isPartialWordCharacter(value: string | undefined): boolean {
  return value ? /[\p{Script=Hangul}\p{Letter}\p{Number}_]/u.test(value) : false;
}

function roleOrder(role: EntityRole): number {
  return role === "who" ? 0 : 1;
}
