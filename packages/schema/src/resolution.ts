import { z } from 'zod';

/**
 * Reason codes for rejecting a candidate server
 */
export const RejectReasonCode = z.enum([
  'MISSING_CATEGORY',
  'MISSING_SCOPE',
  'RESIDENCY_MISMATCH',
  'SENSITIVITY_EXCEEDED',
  'UNSIGNED_NOT_ALLOWED',
]);
export type RejectReasonCode = z.infer<typeof RejectReasonCode>;

/**
 * Rejection reason with code and human-readable message
 */
export const RejectionReason = z.object({
  code: RejectReasonCode,
  message: z.string(),
});
export type RejectionReason = z.infer<typeof RejectionReason>;

/**
 * Rejected candidate server
 */
export const RejectedCandidate = z.object({
  serverId: z.string(),
  version: z.string(),
  reason: RejectionReason,
});
export type RejectedCandidate = z.infer<typeof RejectedCandidate>;

/**
 * Selected server with selection reason
 */
export const SelectedServer = z.object({
  serverId: z.string(),
  version: z.string(),
  endpoint: z.string(),
  scopes: z.array(z.string()),
  selectionReason: z.string(),
});
export type SelectedServer = z.infer<typeof SelectedServer>;

/**
 * Resolution result for a single requirement
 */
export const RequirementResolution = z.object({
  category: z.string(),
  requiredPermissions: z.array(z.string()),
  selected: SelectedServer.nullable(),
  rejected: z.array(RejectedCandidate),
  constraintsApplied: z.object({
    residency: z.string().nullable(),
    sensitivity: z.string().nullable(),
    requireSigned: z.boolean().nullable(),
  }),
});
export type RequirementResolution = z.infer<typeof RequirementResolution>;

/**
 * Complete resolution explanation output
 */
export const ResolutionExplanation = z.object({
  agentName: z.string(),
  agentVersion: z.string(),
  resolvedAt: z.string(),
  success: z.boolean(),
  requirements: z.array(RequirementResolution),
});
export type ResolutionExplanation = z.infer<typeof ResolutionExplanation>;
