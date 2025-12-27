import { z } from 'zod';
import { ResidencyLevel, SensitivityLevel } from './agents-md.js';

/**
 * MCP Server data classification
 */
export const McpServerData = z.object({
  residency: z.array(ResidencyLevel),
  maxSensitivity: SensitivityLevel,
});
export type McpServerData = z.infer<typeof McpServerData>;

/**
 * MCP Server trust information
 */
export const McpServerTrust = z.object({
  signed: z.boolean(),
  publisher: z.string(),
});
export type McpServerTrust = z.infer<typeof McpServerTrust>;

/**
 * MCP Server policy
 */
export const McpServerPolicy = z.object({
  rateLimitPerMin: z.number().optional(),
});
export type McpServerPolicy = z.infer<typeof McpServerPolicy>;

/**
 * Single MCP server entry in the index
 */
export const McpServer = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  endpoint: z.string().min(1),
  categories: z.array(z.string().min(1)),
  scopes: z.array(z.string()),
  data: McpServerData,
  trust: McpServerTrust,
  policy: McpServerPolicy.optional(),
});
export type McpServer = z.infer<typeof McpServer>;

/**
 * MCP index file schema (array of servers)
 */
export const McpIndex = z.array(McpServer);
export type McpIndex = z.infer<typeof McpIndex>;
