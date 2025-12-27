import { z } from 'zod';

/**
 * Sensitivity levels for data classification
 */
export const SensitivityLevel = z.enum([
  'public',
  'internal',
  'confidential',
  'pii.low',
  'pii.moderate',
  'pii.high',
]);
export type SensitivityLevel = z.infer<typeof SensitivityLevel>;

/**
 * Data residency requirements
 */
export const ResidencyLevel = z.enum(['any', 'us-only', 'eu-only']);
export type ResidencyLevel = z.infer<typeof ResidencyLevel>;

/**
 * MCP requirement in agents.md frontmatter
 */
export const McpRequirement = z.object({
  category: z.string().min(1),
  permissions: z.array(z.string().min(1)),
});
export type McpRequirement = z.infer<typeof McpRequirement>;

/**
 * Data constraints
 */
export const DataConstraints = z.object({
  sensitivity: SensitivityLevel.optional(),
  residency: ResidencyLevel.optional(),
});
export type DataConstraints = z.infer<typeof DataConstraints>;

/**
 * Action constraints
 */
export const ActionConstraints = z.object({
  forbid: z.array(z.string()).optional(),
});
export type ActionConstraints = z.infer<typeof ActionConstraints>;

/**
 * Constraints block
 */
export const Constraints = z.object({
  data: DataConstraints.optional(),
  actions: ActionConstraints.optional(),
});
export type Constraints = z.infer<typeof Constraints>;

/**
 * Requires block
 */
export const Requires = z.object({
  mcp: z.array(McpRequirement).min(1),
});
export type Requires = z.infer<typeof Requires>;

/**
 * Complete agents.md frontmatter schema
 */
export const AgentsFrontmatter = z.object({
  name: z.string().min(1, 'Agent name is required'),
  version: z.string().min(1, 'Agent version is required'),
  requires: Requires,
  constraints: Constraints.optional(),
});
export type AgentsFrontmatter = z.infer<typeof AgentsFrontmatter>;

/**
 * Ordered sensitivity levels for comparison (higher index = more sensitive)
 */
export const SENSITIVITY_ORDER: readonly SensitivityLevel[] = [
  'public',
  'internal',
  'confidential',
  'pii.low',
  'pii.moderate',
  'pii.high',
] as const;

/**
 * Get the sensitivity level index for comparison
 */
export function getSensitivityIndex(level: SensitivityLevel): number {
  return SENSITIVITY_ORDER.indexOf(level);
}

/**
 * Check if required sensitivity exceeds server's max sensitivity
 */
export function sensitivityExceeds(
  required: SensitivityLevel,
  serverMax: SensitivityLevel
): boolean {
  return getSensitivityIndex(required) > getSensitivityIndex(serverMax);
}
