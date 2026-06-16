import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CertV2Schema, InstitutionalMetricsSchema } from "../schema/cert-v2.ts";
import { loadPropositions } from "../lib/data.ts";
import { cloneProposition, readJsonFile } from "./test-utils.ts";

describe("Cert v2 schema", () => {
  it("parses a valid seed", async () => {
    const [seed] = await loadPropositions();

    expect(CertV2Schema.safeParse(seed).success).toBe(true);
  });

  it.each(["evaluation", "interpretation", "normative"])(
    "rejects unsupported claimNature %s",
    async (claimNature) => {
      const [seed] = await loadPropositions();
      const candidate = cloneProposition(seed) as unknown as Record<string, unknown>;
      candidate.claimNature = claimNature;

      expect(CertV2Schema.safeParse(candidate).success).toBe(false);
    }
  );

  it("requires gradeDivergenceNote when factualGrade and truthfulGrade diverge", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed);
    candidate.assessment = {
      ...candidate.assessment,
      factualGrade: "fully_reliable",
      truthfulGrade: "largely_reliable"
    };
    delete candidate.assessment.gradeDivergenceNote;

    expect(CertV2Schema.safeParse(candidate).success).toBe(false);

    candidate.assessment.gradeDivergenceNote = "기초 사실성과 진술 충실성이 다른 이유를 설명한다.";

    expect(CertV2Schema.safeParse(candidate).success).toBe(true);
  });

  it("requires undeterminedItems for undetermined assessments", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed);
    candidate.assessment = {
      ...candidate.assessment,
      factualGrade: null,
      truthfulGrade: null,
      status: "undetermined",
      gradeRationale: "증거 또는 절차가 부족해 현 시점 기준 라벨을 산정하지 않았다."
    };
    delete candidate.assessment.gradeDivergenceNote;
    candidate.undeterminedItems = [];

    expect(CertV2Schema.safeParse(candidate).success).toBe(false);

    candidate.undeterminedItems = ["원문 대조 범위 확정 필요"];

    expect(CertV2Schema.safeParse(candidate).success).toBe(true);
  });

  it("rejects an empty gradeRationale", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed);
    candidate.assessment.gradeRationale = "   ";

    expect(CertV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("rejects sensitive true without a presumptionNotice", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed);
    candidate.sensitive = {
      sensitive: true,
      sensitivityReason: ["political_claim"],
      legalStatus: "allegation",
      presumptionNotice: " "
    };

    expect(CertV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("rejects shortQuote longer than 15 words", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed);
    candidate.evidence[0] = {
      ...candidate.evidence[0],
      shortQuote:
        "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen"
    };

    expect(CertV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("defaults openCorrectionRequests to 0 and rejects negatives", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed) as unknown as Record<string, unknown>;
    delete candidate.openCorrectionRequests;
    const parsed = CertV2Schema.safeParse(candidate);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.openCorrectionRequests).toBe(0);
    }

    candidate.openCorrectionRequests = -1;
    expect(CertV2Schema.safeParse(candidate).success).toBe(false);
  });
});

describe("InstitutionalMetrics schema", () => {
  it("parses the live institutional-metrics.json", async () => {
    const metrics = await readJsonFile(join(process.cwd(), "data", "institutional-metrics.json"));
    expect(InstitutionalMetricsSchema.safeParse(metrics).success).toBe(true);
  });

  it("rejects the legacy shape (totalPropositionsVerified only)", () => {
    const legacy = {
      totalPropositionsVerified: 3,
      measuredErrorRate: {
        value: null,
        unit: "ratio",
        sampleSize: 0,
        periodStart: "2026-06-15",
        periodEnd: "2026-06-15",
        method: "x",
        status: "unmeasured_insufficient_sample"
      },
      externalAudits: [],
      status: "unestablished"
    };
    expect(InstitutionalMetricsSchema.safeParse(legacy).success).toBe(false);
  });
});
