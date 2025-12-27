import { createHash } from 'crypto';

/**
 * Compute deterministic hash for a locked server selection.
 * hash = sha256(id + "@" + version + "|" + endpoint + "|" + sorted_scopes.join(","))
 */
export function computeServerHash(
  id: string,
  version: string,
  endpoint: string,
  scopes: readonly string[]
): string {
  const sortedScopes = [...scopes].sort();
  const input = `${id}@${version}|${endpoint}|${sortedScopes.join(',')}`;
  return createHash('sha256').update(input).digest('hex');
}
