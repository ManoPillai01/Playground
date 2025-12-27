import { z } from 'zod';
import { SensitivityLevel, ResidencyLevel } from './agents-md.js';

/**
 * Policy rule types
 */
export const PolicyRuleType = z.enum([
  'require-signed',
  'require-residency',
  'require-sensitivity',
  'forbid-server',
  'allow-server',
]);
export type PolicyRuleType = z.infer<typeof PolicyRuleType>;

/**
 * Policy rule
 */
export const PolicyRule = z.object({
  id: z.string(),
  type: PolicyRuleType,
  value: z.unknown(),
  severity: z.enum(['warning', 'error']).default('error'),
  message: z.string(),
});
export type PolicyRule = z.infer<typeof PolicyRule>;

/**
 * Policy definition
 */
export const Policy = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  priority: z.number().default(0),
  rules: z.array(PolicyRule),
});
export type Policy = z.infer<typeof Policy>;

/**
 * Effective constraints after policy merge
 */
export const EffectiveConstraints = z.object({
  requireSigned: z.boolean().nullable(),
  residency: ResidencyLevel.nullable(),
  sensitivity: SensitivityLevel.nullable(),
  forbiddenServers: z.array(z.string()),
  allowedServers: z.array(z.string()).nullable(),
});
export type EffectiveConstraints = z.infer<typeof EffectiveConstraints>;

/**
 * Policy evaluation result
 */
export const PolicyResult = z.object({
  success: z.boolean(),
  policiesApplied: z.array(z.object({
    id: z.string(),
    name: z.string(),
    rulesTriggered: z.array(z.string()),
  })),
  effectiveConstraints: EffectiveConstraints,
  violations: z.array(z.object({
    ruleId: z.string(),
    policyId: z.string(),
    severity: z.enum(['warning', 'error']),
    message: z.string(),
  })),
  warnings: z.array(z.object({
    ruleId: z.string(),
    policyId: z.string(),
    message: z.string(),
  })),
});
export type PolicyResult = z.infer<typeof PolicyResult>;
