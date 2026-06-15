import { z } from "zod";

const isoStringSchema = z.string().refine((value) => {
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(
      value
    )
  ) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}, "Expected an ISO 8601 date or date-time string");

const statementIdSchema = z.string().regex(/^stmt:[a-f0-9]{24}$/);
const versionIdSchema = z.string().regex(/^ver:[a-f0-9]{16}$/);
const sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const GradeSchema = z.enum([
  "fully_reliable",
  "largely_reliable",
  "mixed",
  "largely_unreliable",
  "not_reliable"
]);

export const AssessmentSchema = z.object({
  factualGrade: GradeSchema.nullable(),
  truthfulGrade: GradeSchema.nullable(),
  status: z.enum(["assessed", "undetermined"]),
  gradeRationale: z.string().min(1),
  gradeDivergenceNote: z.string().optional(),
  rubricVersion: z.string().min(1),
  pipelineVersion: z.string().min(1)
});

const evidenceSpanSchema = z
  .object({
    start: z.number().int().min(0),
    end: z.number().int()
  })
  .superRefine((span, ctx) => {
    if (span.end <= span.start) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "end must be greater than start"
      });
    }
  });

const maxFifteenWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length <= 15;

export const ProvenanceSchema = z.object({
  productionIndependence: z.enum(["independent", "govt_produced", "party_interested", "contested"]),
  productionConcerns: z.array(z.string()).default([]),
  requiresMethodologyAudit: z.boolean()
});

export const EvidenceItemSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  retrievedAt: isoStringSchema,
  evidenceSpans: z.array(evidenceSpanSchema).min(1),
  spanHash: sha256Schema,
  shortQuote: z.string().min(1).refine(maxFifteenWords, "shortQuote must be 15 words or fewer").optional(),
  archiveUrl: z.string().url().optional(),
  archiveProvider: z.enum(["internet_archive", "perma", "manual_pdf", "repository", "other"]).optional(),
  archivedAt: isoStringSchema.optional(),
  retrievalMethod: z.enum(["manual", "crawler", "pdf_extract", "api", "official_gazette", "court_document"]),
  retrievalLimitations: z.string(),
  independenceGroupId: z.string().min(1),
  independenceLevel: z.enum(["independent", "partially_independent", "shared_origin", "unknown"]),
  independenceNote: z.string(),
  sourceCompetence: z.enum(["domain_expert", "relevant", "tangential", "unqualified"]),
  competenceNote: z.string(),
  sourceType: z.enum(["primary_producer", "secondary_report", "aggregator"]),
  sourceProvenance: ProvenanceSchema
});

export const ReviewLogSchema = z.object({
  redteam: z.object({
    strongestCounterargument: z.string(),
    response: z.string(),
    errorsFound: z.number().int().min(0),
    framingChecks: z.string()
  }),
  symmetry: z.object({
    checked: z.boolean(),
    method: z.string(),
    pairedPropositionId: statementIdSchema.optional(),
    result: z.string()
  }),
  authorityCheck: z.object({
    checked: z.boolean(),
    note: z.string()
  }),
  humanReview: z.object({
    reviewer: z.string(),
    date: isoStringSchema,
    checksPerformed: z.array(
      z.enum(["omission", "asymmetry", "framing", "authority_assumption"])
    ),
    reviewMemo: z.string(),
    adoptedReason: z.string(),
    rejectedAlternatives: z.string()
  })
});

export const SensitivePolicySchema = z
  .object({
    sensitive: z.boolean(),
    sensitivityReason: z
      .array(
        z.enum([
          "living_person",
          "criminal_allegation",
          "ongoing_litigation",
          "political_claim",
          "medical_or_financial_harm"
        ])
      )
      .default([]),
    legalStatus: z.enum(["final_judgment", "pending", "allegation", "official_record", "unknown"]),
    presumptionNotice: z.string()
  })
  .superRefine((policy, ctx) => {
    if (policy.sensitive && !policy.presumptionNotice.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["presumptionNotice"],
        message: "presumptionNotice is required when sensitive is true"
      });
    }
  });

export const CorrectionSchema = z.object({
  date: isoStringSchema,
  error: z.string(),
  detectedBy: z.string(),
  before: z.string(),
  after: z.string(),
  scoreChange: z.string(),
  newVersionId: versionIdSchema
});

export const CertV2Schema = z
  .object({
    certVersion: z.literal("2.0"),
    propositionId: statementIdSchema,
    versionId: versionIdSchema,
    certHash: sha256Schema,
    previousVersionId: versionIdSchema.optional(),
    canonicalProposition: z.string().min(10).max(300),
    originalClaim: z.string().optional(),
    claimNature: z.enum(["event_occurrence", "document_content"]),
    classification: z.enum(["F", "O", "M"]),
    language: z.enum(["ko", "en"]),
    asOfDate: isoStringSchema,
    status: z.enum(["active", "superseded", "retracted", "needs_review"]),
    assessment: AssessmentSchema,
    evidence: z.array(EvidenceItemSchema).min(1),
    reviewLog: ReviewLogSchema,
    sensitive: SensitivePolicySchema,
    undeterminedItems: z.array(z.string()).default([]),
    correctionHistory: z.array(CorrectionSchema).default([]),
    limitations: z.string(),
    tags: z.array(z.string()).default([]),
    createdAt: isoStringSchema,
    updatedAt: isoStringSchema
  })
  .superRefine((cert, ctx) => {
    const { assessment } = cert;

    if (!assessment.gradeRationale.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["assessment", "gradeRationale"],
        message: "gradeRationale must be non-empty"
      });
    }

    if (assessment.status === "assessed") {
      if (assessment.factualGrade === null) {
        ctx.addIssue({
          code: "custom",
          path: ["assessment", "factualGrade"],
          message: "factualGrade is required when assessment.status is assessed"
        });
      }

      if (assessment.truthfulGrade === null) {
        ctx.addIssue({
          code: "custom",
          path: ["assessment", "truthfulGrade"],
          message: "truthfulGrade is required when assessment.status is assessed"
        });
      }
    }

    if (assessment.status === "undetermined" && cert.undeterminedItems.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["undeterminedItems"],
        message: "undetermined assessments must include at least one undetermined item"
      });
    }

    if (
      assessment.factualGrade !== null &&
      assessment.truthfulGrade !== null &&
      assessment.factualGrade !== assessment.truthfulGrade &&
      !assessment.gradeDivergenceNote?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["assessment", "gradeDivergenceNote"],
        message: "gradeDivergenceNote is required when factualGrade and truthfulGrade differ"
      });
    }
  });

export const InstitutionalMetricsSchema = z.object({
  totalPropositionsVerified: z.number().int(),
  measuredErrorRate: z.object({
    value: z.number().nullable(),
    unit: z.literal("ratio"),
    sampleSize: z.number().int(),
    periodStart: isoStringSchema,
    periodEnd: isoStringSchema,
    method: z.string(),
    status: z.enum(["measured", "unmeasured_insufficient_sample"])
  }),
  externalAudits: z.array(
    z.object({
      auditor: z.string(),
      date: isoStringSchema,
      reportUrl: z.string().url(),
      sampleSize: z.number().int(),
      findingsSummary: z.string()
    })
  ),
  status: z.enum(["established", "unestablished"])
});

export const CertV2CollectionSchema = z.array(CertV2Schema);
