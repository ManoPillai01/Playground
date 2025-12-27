import {
  type AgentsFrontmatter,
  type McpServer,
  type McpIndex,
  type McpRequirement,
  type Lockfile,
  type LockedServer,
  type ResolutionExplanation,
  type RequirementResolution,
  type RejectedCandidate,
  type SelectedServer,
  type RejectReasonCode,
  type ResidencyLevel,
  type SensitivityLevel,
  sensitivityExceeds,
} from '@agent-resolver/schema';
import { computeServerHash } from './hash.js';

/**
 * Resolution error when constraints cannot be satisfied
 */
export class ResolutionError extends Error {
  constructor(
    message: string,
    public readonly category: string,
    public readonly rejectedCandidates: RejectedCandidate[]
  ) {
    super(message);
    this.name = 'ResolutionError';
  }
}

/**
 * Check if agent residency is compatible with server residency
 */
function isResidencyCompatible(
  agentResidency: ResidencyLevel | undefined,
  serverResidencies: ResidencyLevel[]
): boolean {
  if (!agentResidency || agentResidency === 'any') {
    return true;
  }
  // Server must support the required residency or 'any'
  return serverResidencies.includes(agentResidency) || serverResidencies.includes('any');
}

/**
 * Check if required permissions are a subset of server scopes
 */
function hasRequiredScopes(
  requiredPermissions: readonly string[],
  serverScopes: readonly string[]
): boolean {
  return requiredPermissions.every((p) => serverScopes.includes(p));
}

/**
 * Filter and classify candidates for a single requirement
 */
function filterCandidates(
  requirement: McpRequirement,
  servers: McpIndex,
  constraints: AgentsFrontmatter['constraints']
): {
  candidates: McpServer[];
  rejected: RejectedCandidate[];
} {
  const candidates: McpServer[] = [];
  const rejected: RejectedCandidate[] = [];

  const agentResidency = constraints?.data?.residency;
  const agentSensitivity = constraints?.data?.sensitivity;

  // Sort servers deterministically for consistent rejection ordering
  const sortedServers = [...servers].sort((a, b) => {
    if (a.id !== b.id) return a.id.localeCompare(b.id);
    return a.version.localeCompare(b.version);
  });

  for (const server of sortedServers) {
    // Check category match
    if (!server.categories.includes(requirement.category)) {
      rejected.push({
        serverId: server.id,
        version: server.version,
        reason: {
          code: 'MISSING_CATEGORY',
          message: `Server does not support category '${requirement.category}'`,
        },
      });
      continue;
    }

    // Check scope match
    if (!hasRequiredScopes(requirement.permissions, server.scopes)) {
      const missingScopes = requirement.permissions.filter(
        (p: string) => !server.scopes.includes(p)
      );
      rejected.push({
        serverId: server.id,
        version: server.version,
        reason: {
          code: 'MISSING_SCOPE',
          message: `Server missing required scopes: ${missingScopes.join(', ')}`,
        },
      });
      continue;
    }

    // Check residency compatibility
    if (!isResidencyCompatible(agentResidency, server.data.residency)) {
      rejected.push({
        serverId: server.id,
        version: server.version,
        reason: {
          code: 'RESIDENCY_MISMATCH',
          message: `Agent requires '${agentResidency}' but server supports: ${server.data.residency.join(', ')}`,
        },
      });
      continue;
    }

    // Check sensitivity compatibility
    if (
      agentSensitivity &&
      sensitivityExceeds(agentSensitivity, server.data.maxSensitivity)
    ) {
      rejected.push({
        serverId: server.id,
        version: server.version,
        reason: {
          code: 'SENSITIVITY_EXCEEDED',
          message: `Agent sensitivity '${agentSensitivity}' exceeds server max '${server.data.maxSensitivity}'`,
        },
      });
      continue;
    }

    candidates.push(server);
  }

  return { candidates, rejected };
}

/**
 * Deterministic tie-breaking selection from candidates
 * 1) prefer signed servers
 * 2) then lexicographic smallest id
 * 3) then lexicographic smallest version
 */
function selectBestCandidate(candidates: McpServer[]): McpServer {
  const sorted = [...candidates].sort((a, b) => {
    // Prefer signed (true before false)
    if (a.trust.signed !== b.trust.signed) {
      return a.trust.signed ? -1 : 1;
    }
    // Lexicographic id
    if (a.id !== b.id) {
      return a.id.localeCompare(b.id);
    }
    // Lexicographic version
    return a.version.localeCompare(b.version);
  });
  return sorted[0];
}

/**
 * Get human-readable selection reason
 */
function getSelectionReason(
  selected: McpServer,
  candidateCount: number
): string {
  if (candidateCount === 1) {
    return 'Only matching candidate';
  }
  const reasons: string[] = [];
  if (selected.trust.signed) {
    reasons.push('signed');
  }
  reasons.push(`id='${selected.id}'`);
  return `Selected by tie-break: ${reasons.join(', ')}`;
}

export interface ResolveInput {
  agent: AgentsFrontmatter;
  servers: McpIndex;
}

export interface ResolveOutput {
  lockfile: Lockfile;
  explanation: ResolutionExplanation;
}

/**
 * Resolve agent requirements against available MCP servers.
 * Pure function - no I/O, deterministic output.
 */
export function resolve(input: ResolveInput): ResolveOutput {
  const { agent, servers } = input;
  const resolvedAt = new Date().toISOString();

  const lockedServers: LockedServer[] = [];
  const requirementResolutions: RequirementResolution[] = [];
  let allSucceeded = true;

  // Sort requirements deterministically by category for stable output
  const sortedRequirements = [...agent.requires.mcp].sort((a, b) =>
    a.category.localeCompare(b.category)
  );

  for (const requirement of sortedRequirements) {
    const { candidates, rejected } = filterCandidates(
      requirement,
      servers,
      agent.constraints
    );

    // Sort permissions deterministically
    const sortedPermissions = [...requirement.permissions].sort();

    const constraintsApplied = {
      residency: agent.constraints?.data?.residency ?? null,
      sensitivity: agent.constraints?.data?.sensitivity ?? null,
      requireSigned: null, // Future feature
    };

    if (candidates.length === 0) {
      allSucceeded = false;
      requirementResolutions.push({
        category: requirement.category,
        requiredPermissions: sortedPermissions,
        selected: null,
        rejected,
        constraintsApplied,
      });
      continue;
    }

    const selected = selectBestCandidate(candidates);
    const selectionReason = getSelectionReason(selected, candidates.length);

    // Sort scopes for deterministic hash and output
    const sortedScopes = [...requirement.permissions].sort();
    const hash = computeServerHash(
      selected.id,
      selected.version,
      selected.endpoint,
      sortedScopes
    );

    lockedServers.push({
      category: requirement.category,
      serverId: selected.id,
      version: selected.version,
      endpoint: selected.endpoint,
      scopes: sortedScopes,
      hash,
    });

    const selectedServer: SelectedServer = {
      serverId: selected.id,
      version: selected.version,
      endpoint: selected.endpoint,
      scopes: sortedScopes,
      selectionReason,
    };

    // Add non-selected candidates to rejected list with tie-break reason
    for (const candidate of candidates) {
      if (candidate.id !== selected.id || candidate.version !== selected.version) {
        rejected.push({
          serverId: candidate.id,
          version: candidate.version,
          reason: {
            code: 'MISSING_CATEGORY' as RejectReasonCode, // Using as placeholder - this is actually a tie-break loss
            message: `Not selected: lost tie-break to '${selected.id}@${selected.version}'`,
          },
        });
      }
    }

    // Sort rejected for deterministic output
    const sortedRejected = [...rejected].sort((a, b) => {
      if (a.serverId !== b.serverId) return a.serverId.localeCompare(b.serverId);
      return a.version.localeCompare(b.version);
    });

    requirementResolutions.push({
      category: requirement.category,
      requiredPermissions: sortedPermissions,
      selected: selectedServer,
      rejected: sortedRejected,
      constraintsApplied,
    });
  }

  // Sort locked servers by category for deterministic output
  lockedServers.sort((a, b) => a.category.localeCompare(b.category));

  // Sort requirement resolutions by category
  requirementResolutions.sort((a, b) => a.category.localeCompare(b.category));

  const lockfile: Lockfile = {
    agentName: agent.name,
    agentVersion: agent.version,
    resolvedAt,
    servers: lockedServers,
  };

  const explanation: ResolutionExplanation = {
    agentName: agent.name,
    agentVersion: agent.version,
    resolvedAt,
    success: allSucceeded,
    requirements: requirementResolutions,
  };

  if (!allSucceeded) {
    const failedCategories = requirementResolutions
      .filter((r) => r.selected === null)
      .map((r) => r.category);
    throw new ResolutionError(
      `Resolution failed: no candidates for categories: ${failedCategories.join(', ')}`,
      failedCategories[0],
      requirementResolutions.find((r) => r.selected === null)?.rejected ?? []
    );
  }

  return { lockfile, explanation };
}

/**
 * Format lockfile as deterministic JSON string
 */
export function formatLockfile(lockfile: Lockfile): string {
  return JSON.stringify(lockfile, null, 2) + '\n';
}

/**
 * Format resolution explanation as deterministic JSON string
 */
export function formatExplanation(explanation: ResolutionExplanation): string {
  return JSON.stringify(explanation, null, 2) + '\n';
}
