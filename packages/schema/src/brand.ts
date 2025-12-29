import { z } from 'zod';

/**
 * Brand alignment status values
 */
export const BrandAlignmentStatus = z.enum(['on-brand', 'borderline', 'off-brand']);
export type BrandAlignmentStatus = z.infer<typeof BrandAlignmentStatus>;

/**
 * Canonical example of brand content
 */
export const BrandExample = z.object({
  content: z.string().min(1),
  type: z.enum(['good', 'bad']).default('good'),
  note: z.string().optional(),
});
export type BrandExample = z.infer<typeof BrandExample>;

/**
 * Brand Profile - the source of truth for brand consistency
 */
export const BrandProfile = z.object({
  /** Profile name/identifier */
  name: z.string().min(1),

  /** Profile version (semver format recommended) */
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),

  /** Brand values (5-10 recommended) */
  values: z.array(z.string().min(1)).min(1).max(20),

  /** Voice descriptors (e.g., "optimistic", "premium", "human") */
  voiceDescriptors: z.array(z.string().min(1)).min(1).max(10),

  /** Acceptable tone characteristics */
  toneAcceptable: z.array(z.string().min(1)).default([]),

  /** Unacceptable tone characteristics */
  toneUnacceptable: z.array(z.string().min(1)).default([]),

  /** "Never do / never say" rules */
  neverRules: z.array(z.string().min(1)).default([]),

  /** Canonical examples of brand content */
  examples: z.array(BrandExample).default([]),

  /** Optional description of the brand */
  description: z.string().optional(),

  /** Timestamp when profile was created */
  createdAt: z.string().datetime().optional(),

  /** Timestamp when profile was last updated */
  updatedAt: z.string().datetime().optional(),
});
export type BrandProfile = z.infer<typeof BrandProfile>;

/**
 * Content to be evaluated for brand consistency
 */
export const BrandCheckRequest = z.object({
  /** The content to evaluate */
  content: z.string().min(1),

  /** Optional content type hint */
  contentType: z.enum([
    'ad-copy',
    'social-post',
    'influencer-script',
    'press-release',
    'campaign-name',
    'ai-generated',
    'email',
    'website',
    'other'
  ]).optional(),

  /** Optional metadata */
  metadata: z.record(z.string()).optional(),
});
export type BrandCheckRequest = z.infer<typeof BrandCheckRequest>;

/**
 * Explanation bullet point for brand check result
 */
export const BrandExplanation = z.object({
  /** The explanation text */
  text: z.string().min(1),

  /** Which aspect of brand this relates to */
  aspect: z.enum(['value', 'voice', 'tone', 'never-rule', 'example-match']).optional(),

  /** Severity/importance of this point */
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
});
export type BrandExplanation = z.infer<typeof BrandExplanation>;

/**
 * Brand check response - the output of a brand consistency check
 */
export const BrandCheckResponse = z.object({
  /** Brand alignment status */
  status: BrandAlignmentStatus,

  /** Human-readable status with emoji */
  statusDisplay: z.string(),

  /** 1-3 explanation bullet points */
  explanations: z.array(BrandExplanation).min(1).max(3),

  /** Optional confidence score (0-100) */
  confidence: z.number().min(0).max(100).optional(),

  /** Brand profile version used for this check */
  profileVersion: z.string(),

  /** Timestamp of the check */
  checkedAt: z.string().datetime(),

  /** Hash of the input content (for audit) */
  contentHash: z.string(),
});
export type BrandCheckResponse = z.infer<typeof BrandCheckResponse>;

/**
 * Audit log entry for brand checks
 */
export const BrandCheckAuditEntry = z.object({
  /** Unique ID for this audit entry */
  id: z.string(),

  /** Timestamp of the check */
  timestamp: z.string().datetime(),

  /** Brand profile name */
  profileName: z.string(),

  /** Brand profile version used */
  profileVersion: z.string(),

  /** Hash of the input content */
  contentHash: z.string(),

  /** Result status */
  status: BrandAlignmentStatus,

  /** Optional confidence score */
  confidence: z.number().optional(),
});
export type BrandCheckAuditEntry = z.infer<typeof BrandCheckAuditEntry>;

/**
 * Brand configuration file schema (.brandrc.json)
 */
export const BrandConfig = z.object({
  /** Path to the brand profile file */
  profilePath: z.string().default('./brand-profile.json'),

  /** Path to audit log file */
  auditPath: z.string().default('./brand-audit.json'),

  /** Whether to log all checks */
  auditEnabled: z.boolean().default(true),

  /** API server configuration */
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost'),
  }).default({}),
});
export type BrandConfig = z.infer<typeof BrandConfig>;
