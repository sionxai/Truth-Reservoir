import type { z } from "zod";
import type {
  AssessmentSchema,
  CertV2CollectionSchema,
  CertV2Schema,
  CorrectionSchema,
  EvidenceItemSchema,
  GradeSchema,
  InstitutionalMetricsSchema,
  ProvenanceSchema,
  ReviewLogSchema,
  SensitivePolicySchema
} from "../schema/cert-v2.ts";

export type Grade = z.infer<typeof GradeSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type ReviewLog = z.infer<typeof ReviewLogSchema>;
export type SensitivePolicy = z.infer<typeof SensitivePolicySchema>;
export type Correction = z.infer<typeof CorrectionSchema>;
export type Proposition = z.infer<typeof CertV2Schema>;
export type PropositionCollection = z.infer<typeof CertV2CollectionSchema>;
export type InstitutionalMetrics = z.infer<typeof InstitutionalMetricsSchema>;

export type Classification = Proposition["classification"];
export type ClaimNature = Proposition["claimNature"];
export type PropositionStatus = Proposition["status"];
export type PropositionLanguage = Proposition["language"];
