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

  it("requires undeterminedItems for undetermined assessments", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed);
    candidate.assessment = {
      ...candidate.assessment,
      factualGrade: null,
      status: "undetermined",
      gradeRationale: "증거 또는 절차가 부족해 현 시점 기준 라벨을 산정하지 않았다."
    };
    candidate.undeterminedItems = [];

    expect(CertV2Schema.safeParse(candidate).success).toBe(false);

    candidate.undeterminedItems = ["원문 대조 범위 확정 필요"];

    expect(CertV2Schema.safeParse(candidate).success).toBe(true);
  });

  it("requires factualGrade to be null for undetermined assessments", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed);
    candidate.assessment = {
      ...candidate.assessment,
      factualGrade: "fully_reliable",
      status: "undetermined",
      gradeRationale: "증거 또는 절차가 부족해 현 시점 기준 라벨을 산정하지 않았다."
    };
    candidate.undeterminedItems = ["원문 대조 범위 확정 필요"];

    expect(CertV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("requires measurement methodology for measurement claimNature only", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed);
    candidate.claimNature = "measurement";

    expect(CertV2Schema.safeParse(candidate).success).toBe(false);

    candidate.measurement = {
      method: "원문에 공개된 집계 방법을 재현한다.",
      sample: "2026-06-15 기준 공개 표본",
      aggregationBasis: "공개 항목별 단순 합산",
      producer: "foundation-seed",
      measuredAt: "2026-06-15"
    };

    expect(CertV2Schema.safeParse(candidate).success).toBe(true);

    candidate.claimNature = "document_content";
    expect(CertV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("defaults reviewMode to human_reviewed", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed) as unknown as Record<string, unknown>;
    delete candidate.reviewMode;

    const parsed = CertV2Schema.safeParse(candidate);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.reviewMode).toBe("human_reviewed");
    }
  });

  it("strips truthfulGrade from parsed assessments", async () => {
    const [seed] = await loadPropositions();
    const candidate = cloneProposition(seed) as unknown as Record<string, unknown>;
    candidate.assessment = {
      ...(candidate.assessment as Record<string, unknown>),
      truthfulGrade: "fully_reliable"
    };

    const parsed = CertV2Schema.safeParse(candidate);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.assessment).toEqual(
        expect.objectContaining({
          factualGrade: seed.assessment.factualGrade
        })
      );
      expect("truthfulGrade" in parsed.data.assessment).toBe(false);
    }
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
