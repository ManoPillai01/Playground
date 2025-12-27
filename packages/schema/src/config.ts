import { z } from 'zod';

/**
 * Git registry configuration
 */
export const GitRegistry = z.object({
  name: z.string(),
  type: z.literal('git'),
  url: z.string(),
  branch: z.string().default('main'),
  path: z.string().default('.'),
});
export type GitRegistry = z.infer<typeof GitRegistry>;

/**
 * File registry configuration
 */
export const FileRegistry = z.object({
  name: z.string(),
  type: z.literal('file'),
  path: z.string(),
});
export type FileRegistry = z.infer<typeof FileRegistry>;

/**
 * Registry configuration (union)
 */
export const Registry = z.discriminatedUnion('type', [GitRegistry, FileRegistry]);
export type Registry = z.infer<typeof Registry>;

/**
 * Audit configuration
 */
export const AuditConfig = z.object({
  webhook: z.string().optional(),
  includeExplanation: z.boolean().default(true),
});
export type AuditConfig = z.infer<typeof AuditConfig>;

/**
 * Main configuration file schema (.agentrc.json)
 */
export const AgentConfig = z.object({
  registries: z.array(Registry).default([]),
  policies: z.array(z.string()).default([]),
  cache: z.object({
    path: z.string().default('.agent-cache'),
    ttl: z.number().default(3600),
  }).default({}),
  resolve: z.object({
    output: z.string().default('./agents.lock'),
    explainOutput: z.string().default('./agents.resolution.json'),
    alwaysExplain: z.boolean().default(false),
  }).default({}),
  audit: AuditConfig.optional(),
});
export type AgentConfig = z.infer<typeof AgentConfig>;
