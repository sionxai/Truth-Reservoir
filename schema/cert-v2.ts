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
  status: z.enum(["assessed", "undetermined"]),
  gradeRationale: z.string().min(1),
  rubricVersion: z.string().min(1),
  pipelineVersion: z.string().min(1)
});

export const MeasurementSchema = z.object({
  method: z.string().min(1),
  sample: z.string().min(1),
  aggregationBasis: z.string().min(1),
  producer: z.string().min(1),
  measuredAt: isoStringSchema.optional()
});

const maxFifteenWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length <= 15;

const EvidenceLocatorSchema = z.object({
  section: z.string().optional(),
  heading: z.string().optional(),
  page: z.string().optional()
});

export const ProvenanceSchema = z.object({
  productionIndependence: z.enum(["independent", "govt_produced", "party_interested", "contested"]),
  productionConcerns: z.array(z.string()).default([]),
  requiresMethodologyAudit: z.boolean()
});

export const EvidenceItemSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  retrievedAt: isoStringSchema,
  locator: EvidenceLocatorSchema.optional(),
  shortQuote: z.string().min(1).refine(maxFifteenWords, "shortQuote must be 15 words or fewer"),
  quoteHash: sha256Schema,
  archiveStatus: z.enum([
    "archived",
    "archive_attempt_recommended",
    "not_required_stable_artifact",
    "unavailable"
  ]),
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
    certVersion: z.literal("2.1"),
    propositionId: statementIdSchema,
    versionId: versionIdSchema,
    certHash: sha256Schema,
    previousVersionId: versionIdSchema.optional(),
    canonicalProposition: z.string().min(10).max(300),
    originalClaim: z.string().optional(),
    claimNature: z.enum(["event_occurrence", "document_content", "measurement"]),
    measurement: MeasurementSchema.optional(),
    classification: z.enum(["F", "O", "M"]),
    language: z.enum(["ko", "en"]),
    asOfDate: isoStringSchema,
    status: z.enum(["active", "superseded", "retracted", "needs_review"]),
    reviewMode: z.enum(["human_reviewed", "automated_unreviewed"]).default("human_reviewed"),
    assessment: AssessmentSchema,
    evidence: z.array(EvidenceItemSchema).min(1),
    reviewLog: ReviewLogSchema,
    sensitive: SensitivePolicySchema,
    undeterminedItems: z.array(z.string()).default([]),
    correctionHistory: z.array(CorrectionSchema).default([]),
    // Count of currently-open (unresolved) correction requests for this proposition.
    // >0 surfaces an "이의제기 중" notice on the detail page and list card.
    openCorrectionRequests: z.number().int().min(0).default(0),
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
    }

    if (assessment.status === "undetermined") {
      if (assessment.factualGrade !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["assessment", "factualGrade"],
          message: "factualGrade must be null when assessment.status is undetermined"
        });
      }

      if (cert.undeterminedItems.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["undeterminedItems"],
          message: "undetermined assessments must include at least one undetermined item"
        });
      }
    }

    if (cert.claimNature === "measurement" && !cert.measurement) {
      ctx.addIssue({
        code: "custom",
        path: ["measurement"],
        message: "measurement methodology is required when claimNature is measurement"
      });
    }

    if (cert.claimNature !== "measurement" && cert.measurement) {
      ctx.addIssue({
        code: "custom",
        path: ["measurement"],
        message: "measurement methodology must be absent unless claimNature is measurement"
      });
    }
  });

export const InstitutionalMetricsSchema = z.object({
  // Counts split so undetermined entries never inflate the "verified" headline.
  totalEntries: z.number().int().min(0),
  totalAssessed: z.number().int().min(0),
  totalUndetermined: z.number().int().min(0),
  totalRetracted: z.number().int().min(0),
  measuredErrorRate: z.object({
    value: z.number().nullable(),
    unit: z.literal("ratio"),
    sampleSize: z.number().int(),
    periodStart: isoStringSchema,
    periodEnd: isoStringSchema,
    method: z.string(),
    status: z.enum(["measured", "unmeasured_insufficient_sample"])
  }),
  // Correction health — turns the "we correct errors / claims are falsifiable"
  // promise into a measurement. staleCorrectionRequests>0 is a broken-promise signal.
  // medianCorrectionLatencyDays is null + latencyStatus "no_requests_yet" until there
  // is a real sample (distinguishing "fast" from "never measured").
  correctionMetrics: z.object({
    openCorrectionRequests: z.number().int().min(0),
    acceptedCorrections: z.number().int().min(0),
    rejectedCorrections: z.number().int().min(0),
    staleCorrectionRequests: z.number().int().min(0),
    medianCorrectionLatencyDays: z.number().nullable(),
    latencyStatus: z.enum(["measured", "no_requests_yet"]),
    staleThresholdDays: z.number().int().min(0)
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
