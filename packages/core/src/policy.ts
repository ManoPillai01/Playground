import type {
  Policy,
  PolicyResult,
  EffectiveConstraints,
  AgentsFrontmatter,
  SensitivityLevel,
  ResidencyLevel,
} from '@agent-resolver/schema';
import { SENSITIVITY_ORDER, getSensitivityIndex } from '@agent-resolver/schema';

/**
 * Merge multiple policies into effective constraints.
 * Later policies (higher priority) can only tighten constraints, never loosen.
 */
export function mergePolicies(
  policies: Policy[],
  agentConstraints: AgentsFrontmatter['constraints']
): PolicyResult {
  // Sort by priority (lower first, so higher priority applies last)
  const sorted = [...policies].sort((a, b) => a.priority - b.priority);

  const effective: EffectiveConstraints = {
    requireSigned: null,
    residency: agentConstraints?.data?.residency ?? null,
    sensitivity: agentConstraints?.data?.sensitivity ?? null,
    forbiddenServers: [],
    allowedServers: null,
  };

  const policiesApplied: PolicyResult['policiesApplied'] = [];
  const violations: PolicyResult['violations'] = [];
  const warnings: PolicyResult['warnings'] = [];

  for (const policy of sorted) {
    const rulesTriggered: string[] = [];

    for (const rule of policy.rules) {
      switch (rule.type) {
        case 'require-signed':
          if (rule.value === true) {
            effective.requireSigned = true;
            rulesTriggered.push(rule.id);
          }
          break;

        case 'require-residency': {
          const required = rule.value as ResidencyLevel;
          // Can only tighten: any -> specific
          if (effective.residency === 'any' || effective.residency === null) {
            effective.residency = required;
            rulesTriggered.push(rule.id);
          } else if (effective.residency !== required && required !== 'any') {
            // Conflict - policy requires different residency
            violations.push({
              ruleId: rule.id,
              policyId: policy.id,
              severity: rule.severity,
              message: `Residency conflict: agent requires '${effective.residency}' but policy requires '${required}'`,
            });
          }
          break;
        }

        case 'require-sensitivity': {
          const required = rule.value as SensitivityLevel;
          const requiredIdx = getSensitivityIndex(required);
          const currentIdx = effective.sensitivity
            ? getSensitivityIndex(effective.sensitivity)
            : -1;

          // Can only tighten: require higher sensitivity handling
          if (requiredIdx > currentIdx) {
            effective.sensitivity = required;
            rulesTriggered.push(rule.id);
          }
          break;
        }

        case 'forbid-server': {
          const serverId = rule.value as string;
          if (!effective.forbiddenServers.includes(serverId)) {
            effective.forbiddenServers.push(serverId);
            rulesTriggered.push(rule.id);
          }
          break;
        }

        case 'allow-server': {
          const serverIds = rule.value as string[];
          if (effective.allowedServers === null) {
            effective.allowedServers = [...serverIds];
          } else {
            // Intersection - can only tighten
            effective.allowedServers = effective.allowedServers.filter(
              (id) => serverIds.includes(id)
            );
          }
          rulesTriggered.push(rule.id);
          break;
        }
      }
    }

    if (rulesTriggered.length > 0) {
      policiesApplied.push({
        id: policy.id,
        name: policy.name,
        rulesTriggered,
      });
    }
  }

  // Sort for determinism
  effective.forbiddenServers.sort();
  effective.allowedServers?.sort();

  const hasErrors = violations.some((v) => v.severity === 'error');

  return {
    success: !hasErrors,
    policiesApplied,
    effectiveConstraints: effective,
    violations,
    warnings,
  };
}

/**
 * Validate a policy object
 */
export function validatePolicy(data: unknown): { success: boolean; errors?: string[] } {
  // Basic validation - in production would use Zod
  if (!data || typeof data !== 'object') {
    return { success: false, errors: ['Policy must be an object'] };
  }

  const policy = data as Record<string, unknown>;

  if (!policy.id || typeof policy.id !== 'string') {
    return { success: false, errors: ['Policy must have an id'] };
  }

  if (!policy.name || typeof policy.name !== 'string') {
    return { success: false, errors: ['Policy must have a name'] };
  }

  if (!Array.isArray(policy.rules)) {
    return { success: false, errors: ['Policy must have rules array'] };
  }

  return { success: true };
}
