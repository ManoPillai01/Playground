import { z } from 'zod';

/**
 * Single locked MCP server selection
 */
export const LockedServer = z.object({
  category: z.string(),
  serverId: z.string(),
  version: z.string(),
  endpoint: z.string(),
  scopes: z.array(z.string()),
  hash: z.string(),
});
export type LockedServer = z.infer<typeof LockedServer>;

/**
 * Complete lockfile schema
 */
export const Lockfile = z.object({
  agentName: z.string(),
  agentVersion: z.string(),
  resolvedAt: z.string(),
  servers: z.array(LockedServer),
});
export type Lockfile = z.infer<typeof Lockfile>;
