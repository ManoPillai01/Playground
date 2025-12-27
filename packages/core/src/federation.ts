import type { McpIndex, McpServer } from '@agent-resolver/schema';

/**
 * Merge multiple MCP server indexes into one.
 * Later indexes can override earlier ones (same id@version).
 * Result is sorted deterministically.
 */
export function mergeIndexes(indexes: McpIndex[]): McpIndex {
  const serverMap = new Map<string, McpServer>();

  for (const index of indexes) {
    for (const server of index) {
      const key = `${server.id}@${server.version}`;
      serverMap.set(key, server);
    }
  }

  // Sort deterministically by id, then version
  return [...serverMap.values()].sort((a, b) => {
    if (a.id !== b.id) return a.id.localeCompare(b.id);
    return a.version.localeCompare(b.version);
  });
}
