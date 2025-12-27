import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { mergePolicies } from '@agent-resolver/core';
import { validateAgentsFrontmatter } from '@agent-resolver/core';
import type { Policy, AgentsFrontmatter } from '@agent-resolver/schema';
import { readAgentsMd } from '../utils/files.js';
import { loadConfig, mergeWithDefaults } from '../utils/config.js';

/**
 * Load policy from file path
 */
function loadPolicy(path: string): Policy | null {
  if (!existsSync(path)) {
    return null;
  }
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as Policy;
  } catch {
    return null;
  }
}

export const policyCommand = new Command('policy')
  .description('Policy management commands');

policyCommand
  .command('list')
  .description('List configured policies')
  .action(() => {
    const config = mergeWithDefaults(loadConfig());

    if (config.policies.length === 0) {
      console.log('No policies configured.');
      console.log('\nAdd policies to .agentrc.json:');
      console.log(JSON.stringify({
        policies: [
          './org-policy.json',
          './team-policy.json',
        ],
      }, null, 2));
      return;
    }

    console.log('Configured Policies:\n');
    for (const policyPath of config.policies) {
      const policy = loadPolicy(policyPath);
      if (policy) {
        console.log(`  ${policy.name} (${policy.id})`);
        console.log(`    Path: ${policyPath}`);
        console.log(`    Version: ${policy.version}`);
        console.log(`    Priority: ${policy.priority ?? 0}`);
        console.log(`    Rules: ${policy.rules.length}`);
      } else {
        console.log(`  ${policyPath} (not found or invalid)`);
      }
      console.log();
    }
  });

policyCommand
  .command('check')
  .description('Check agent against policies (dry-run)')
  .option('-a, --agents <path>', 'Path to agents.md file', './agents.md')
  .option('-p, --policy <paths...>', 'Additional policy files')
  .action((options) => {
    const config = mergeWithDefaults(loadConfig());

    // Load agent
    let agentData: AgentsFrontmatter;
    try {
      const { data } = readAgentsMd(options.agents);
      const result = validateAgentsFrontmatter(data);
      if (!result.success) {
        console.error('✗ Invalid agents.md');
        process.exit(1);
      }
      agentData = result.data!;
    } catch (error) {
      console.error(`✗ Failed to read agents.md: ${(error as Error).message}`);
      process.exit(1);
    }

    // Load policies
    const policyPaths = [...config.policies, ...(options.policy ?? [])];
    const policies: Policy[] = [];

    for (const path of policyPaths) {
      const policy = loadPolicy(path);
      if (policy) {
        policies.push(policy);
      } else {
        console.warn(`⚠ Could not load policy: ${path}`);
      }
    }

    if (policies.length === 0) {
      console.log('No policies to evaluate.');
      return;
    }

    console.log(`Checking '${agentData.name}@${agentData.version}' against ${policies.length} policy/policies...\n`);

    // Evaluate policies
    const result = mergePolicies(policies, agentData.constraints);

    // Show applied policies
    if (result.policiesApplied.length > 0) {
      console.log('Policies Applied:');
      for (const applied of result.policiesApplied) {
        console.log(`  ${applied.name} (${applied.id})`);
        for (const rule of applied.rulesTriggered) {
          console.log(`    • ${rule}`);
        }
      }
      console.log();
    }

    // Show effective constraints
    console.log('Effective Constraints:');
    const ec = result.effectiveConstraints;
    console.log(`  Require Signed: ${ec.requireSigned ?? 'not set'}`);
    console.log(`  Residency: ${ec.residency ?? 'not set'}`);
    console.log(`  Sensitivity: ${ec.sensitivity ?? 'not set'}`);
    if (ec.forbiddenServers.length > 0) {
      console.log(`  Forbidden Servers: ${ec.forbiddenServers.join(', ')}`);
    }
    if (ec.allowedServers) {
      console.log(`  Allowed Servers: ${ec.allowedServers.join(', ')}`);
    }
    console.log();

    // Show violations
    if (result.violations.length > 0) {
      console.log('Violations:');
      for (const v of result.violations) {
        const icon = v.severity === 'error' ? '✗' : '⚠';
        console.log(`  ${icon} [${v.policyId}/${v.ruleId}] ${v.message}`);
      }
      console.log();
    }

    // Show warnings
    if (result.warnings.length > 0) {
      console.log('Warnings:');
      for (const w of result.warnings) {
        console.log(`  ⚠ [${w.policyId}/${w.ruleId}] ${w.message}`);
      }
      console.log();
    }

    if (result.success) {
      console.log('✓ Policy check passed');
    } else {
      console.error('✗ Policy check failed');
      process.exit(1);
    }
  });

policyCommand
  .command('effective')
  .description('Show effective constraints after policy merge')
  .option('-a, --agents <path>', 'Path to agents.md file', './agents.md')
  .action((options) => {
    const config = mergeWithDefaults(loadConfig());

    // Load agent
    let agentData: AgentsFrontmatter;
    try {
      const { data } = readAgentsMd(options.agents);
      const result = validateAgentsFrontmatter(data);
      if (!result.success) {
        console.error('✗ Invalid agents.md');
        process.exit(1);
      }
      agentData = result.data!;
    } catch (error) {
      console.error(`✗ Failed to read agents.md: ${(error as Error).message}`);
      process.exit(1);
    }

    // Load policies
    const policies: Policy[] = [];
    for (const path of config.policies) {
      const policy = loadPolicy(path);
      if (policy) {
        policies.push(policy);
      }
    }

    // Evaluate
    const result = mergePolicies(policies, agentData.constraints);

    // Output as JSON
    console.log(JSON.stringify(result.effectiveConstraints, null, 2));
  });
