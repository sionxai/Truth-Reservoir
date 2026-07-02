import { describe, expect, it } from "vitest";
import { loadPropositions } from "../lib/data.ts";
import {
  entitiesForProposition,
  entityRegistry,
  linkEntityNamesInText,
  normalizeEntityName,
  skippedEntityCandidates
} from "../lib/entities.ts";
import type { Proposition } from "../lib/types.ts";

function proposition(
  propositionId: string,
  who: string,
  statedBy: string[] = []
): Proposition {
  return {
    propositionId,
    sixW: {
      who,
      when: "2026-01-01",
      where: "서울",
      what: "테스트 사건",
      how: "테스트 방식",
      why: statedBy.map((party) => ({ statedBy: party, reason: "테스트 사유" }))
    }
  } as Proposition;
}

function serializableRegistry(propositions: Proposition[]) {
  return [...entityRegistry(propositions).entries()];
}

describe("entity registry", () => {
  it("creates deterministic slugs independent of proposition input order", () => {
    const first = proposition("stmt:bbbbbbbbbbbbbbbbbbbbbbbb", "중앙선거관리위원회");
    const second = proposition("stmt:aaaaaaaaaaaaaaaaaaaaaaaa", "더불어민주당(강준현 수석대변인)", [
      "중앙선거관리위원회(이상능 선거1국장)"
    ]);

    expect(serializableRegistry([first, second])).toEqual(serializableRegistry([second, first]));
  });

  it("strips trailing parenthetical qualifiers before registry insertion", () => {
    expect(normalizeEntityName("중앙선거관리위원회(이상능 선거1국장)")).toBe(
      "중앙선거관리위원회"
    );
    expect(normalizeEntityName("  Gallup   (갤럽 표본)  ")).toBe("Gallup");

    const registry = entityRegistry([
      proposition("stmt:aaaaaaaaaaaaaaaaaaaaaaaa", "더불어민주당(강준현 수석대변인)")
    ]);

    expect(registry.has("더불어민주당")).toBe(true);
    expect(registry.has("더불어민주당(강준현 수석대변인)")).toBe(false);
  });

  it("keeps every registry entity self-consistent with at least one proposition", async () => {
    const registry = entityRegistry(await loadPropositions());

    expect(registry.size).toBeGreaterThan(0);
    for (const [name, entry] of registry.entries()) {
      expect(entry.slug, name).toMatch(/^e-[A-Za-z0-9_-]+$/);
      expect(entry.propositionIds.length, name).toBeGreaterThanOrEqual(1);
      expect(new Set([...entry.roles.who, ...entry.roles.statedBy]).size, name).toBeGreaterThanOrEqual(1);
    }
  });

  it("skips deterministic junk who phrases instead of creating garbage hubs", () => {
    const registry = entityRegistry([
      proposition(
        "stmt:aaaaaaaaaaaaaaaaaaaaaaaa",
        "국내 증시 개인투자자 및 집계 주체(금융투자협회·한국거래소)"
      ),
      proposition(
        "stmt:bbbbbbbbbbbbbbbbbbbbbbbb",
        "Kelley 등 연구진, HIV 음성 MSM CRAI 참여자 41명, 항문성교 경험이 없는 대조군 21명",
        ["Kelley CF 등"]
      )
    ]);
    const skipped = skippedEntityCandidates([
      proposition(
        "stmt:aaaaaaaaaaaaaaaaaaaaaaaa",
        "국내 증시 개인투자자 및 집계 주체(금융투자협회·한국거래소)"
      ),
      proposition(
        "stmt:bbbbbbbbbbbbbbbbbbbbbbbb",
        "Kelley 등 연구진, HIV 음성 MSM CRAI 참여자 41명, 항문성교 경험이 없는 대조군 21명",
        ["Kelley CF 등"]
      )
    ]);

    expect(registry.has("국내 증시 개인투자자 및 집계 주체")).toBe(false);
    expect(
      registry.has(
        "Kelley 등 연구진, HIV 음성 MSM CRAI 참여자 41명, 항문성교 경험이 없는 대조군 21명"
      )
    ).toBe(false);
    expect(registry.has("Kelley CF 등")).toBe(true);
    expect(skipped.map((item) => item.reason)).toEqual(["junk_who_phrase", "junk_who_phrase"]);
  });

  it("links H1 entity names at word boundaries including a trailing Korean josa", () => {
    const central = proposition("stmt:aaaaaaaaaaaaaaaaaaaaaaaa", "중앙선거관리위원회");
    const registry = entityRegistry([central]);

    // 공백/구두점 경계 → 링크
    expect(
      linkEntityNamesInText("중앙선거관리위원회 발표", registry).filter((segment) => segment.entity)
    ).toHaveLength(1);
    // 한국어 조사(는)가 붙어도 경계로 보고 링크 (나무위키식 인라인 링크의 핵심)
    expect(
      linkEntityNamesInText("중앙선거관리위원회는 발표했다", registry).filter(
        (segment) => segment.entity
      )
    ).toHaveLength(1);
    // 조사가 아닌 한글이 이어지면(더 긴 단어의 일부) → 링크하지 않음(과대링크 방지)
    const usaRegistry = entityRegistry([proposition("stmt:bbbbbbbbbbbbbbbbbbbbbbbb", "미국")]);
    expect(
      linkEntityNamesInText("미국인 통계", usaRegistry).filter((segment) => segment.entity)
    ).toHaveLength(0);

    expect(entitiesForProposition(central, registry)).toMatchObject([
      { name: "중앙선거관리위원회", roles: ["who"] }
    ]);
  });
});
