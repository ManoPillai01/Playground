import { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  resolve,
  formatLockfile,
  formatExplanation,
  validateAgentsFrontmatter,
  validateMcpIndex,
  ResolutionError,
  mergeIndexes,
  mergePolicies,
} from '@agent-resolver/core';
import { type AgentsFrontmatter, type McpIndex, type Policy } from '@agent-resolver/schema';
import { readAgentsMd, readMcpIndex, writeFile } from '../utils/files.js';
import { loadConfig, mergeWithDefaults } from '../utils/config.js';

/**
 * Load all indexes from config and CLI options
 */
function loadAllIndexes(cliIndex: string | undefined, config: ReturnType<typeof mergeWithDefaults>): McpIndex {
  const indexes: McpIndex[] = [];

  // Load from config registries
  for (const registry of config.registries) {
    let indexPath: string;

    if (registry.type === 'file') {
      indexPath = registry.path;
    } else if (registry.type === 'git') {
      // Look in cache
      indexPath = join(config.cache.path, registry.name, registry.path, 'index.json');
      if (!existsSync(indexPath)) {
        // Try alternate locations
        indexPath = join(config.cache.path, registry.name, registry.path);
        if (!existsSync(indexPath)) {
          console.warn(`⚠ Registry '${registry.name}' not synced. Run 'agent sync' first.`);
          continue;
        }
      }
    } else {
      continue;
    }

    if (existsSync(indexPath)) {
      try {
        const data = readMcpIndex(indexPath);
        const result = validateMcpIndex(data);
        if (result.success && result.data) {
          indexes.push(result.data);
        }
      } catch {
        console.warn(`⚠ Could not load index from ${indexPath}`);
      }
    }
  }

  // Load CLI-specified index (takes precedence)
  if (cliIndex && existsSync(cliIndex)) {
    try {
      const data = readMcpIndex(cliIndex);
      const result = validateMcpIndex(data);
      if (result.success && result.data) {
        indexes.push(result.data);
      }
    } catch (error) {
      console.error(`✗ Failed to read index: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  if (indexes.length === 0) {
    console.error('✗ No server indexes found');
    console.error('  Specify with --index or configure registries in .agentrc.json');
    process.exit(1);
  }

  return mergeIndexes(indexes);
}

/**
 * Load all policies from config
 */
function loadAllPolicies(config: ReturnType<typeof mergeWithDefaults>): Policy[] {
  const policies: Policy[] = [];

  for (const policyPath of config.policies) {
    if (existsSync(policyPath)) {
      try {
        const content = readFileSync(policyPath, 'utf-8');
        const policy = JSON.parse(content) as Policy;
        policies.push(policy);
      } catch {
        console.warn(`⚠ Could not load policy from ${policyPath}`);
      }
    }
  }

  return policies;
}

/**
 * Send audit log to webhook
 */
async function sendAuditLog(
  webhookUrl: string,
  agent: AgentsFrontmatter,
  lockfile: unknown,
  explanation: unknown
): Promise<void> {
  try {
    const payload = {
      event: 'resolution',
      timestamp: new Date().toISOString(),
      agent: {
        name: agent.name,
        version: agent.version,
      },
      lockfile,
      explanation,
      environment: {
        user: process.env.USER ?? 'unknown',
        ci: Boolean(process.env.CI),
      },
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    console.warn('⚠ Failed to send audit log');
  }
}

export const resolveCommand = new Command('resolve')
  .description('Resolve agent requirements and generate agents.lock')
  .option('-a, --agents <path>', 'Path to agents.md file', './agents.md')
  .option('-i, --index <path...>', 'Path(s) to mcp.index.json file(s)')
  .option('-o, --output <path>', 'Path to output agents.lock file')
  .option('-e, --explain', 'Also write agents.resolution.json with explanations')
  .option('--explain-output <path>', 'Path to output agents.resolution.json')
  .option('--audit-webhook <url>', 'Send resolution to audit webhook')
  .option('--dry-run', 'Show what would happen without writing files')
  .action(async (options) => {
    const config = mergeWithDefaults(loadConfig());

    // Read and validate agents.md
    let agentData: AgentsFrontmatter;
    try {
      const { data } = readAgentsMd(options.agents);
      const result = validateAgentsFrontmatter(data);
      if (!result.success) {
        console.error('✗ Invalid agents.md:');
        for (const error of result.errors ?? []) {
          console.error(`  - ${error}`);
        }
        process.exit(1);
      }
      agentData = result.data!;
    } catch (error) {
      console.error(`✗ Failed to read agents.md: ${(error as Error).message}`);
      process.exit(1);
    }

    // Load and merge indexes
    const servers = loadAllIndexes(
      Array.isArray(options.index) ? options.index[0] : options.index,
      config
    );

    // Handle multiple --index flags
    if (Array.isArray(options.index) && options.index.length > 1) {
      for (let i = 1; i < options.index.length; i++) {
        const extraPath = options.index[i];
        if (existsSync(extraPath)) {
          try {
            const data = readMcpIndex(extraPath);
            const result = validateMcpIndex(data);
            if (result.success && result.data) {
              servers.push(...result.data);
            }
          } catch {
            console.warn(`⚠ Could not load index from ${extraPath}`);
          }
        }
      }
    }

    // Load and apply policies
    const policies = loadAllPolicies(config);
    let effectiveConstraints = agentData.constraints;

    if (policies.length > 0) {
      const policyResult = mergePolicies(policies, agentData.constraints);

      if (!policyResult.success) {
        console.error('✗ Policy violations:');
        for (const v of policyResult.violations) {
          console.error(`  - [${v.policyId}] ${v.message}`);
        }
        process.exit(1);
      }

      // Apply policy constraints
      if (policyResult.effectiveConstraints.residency) {
        effectiveConstraints = {
          ...effectiveConstraints,
          data: {
            ...effectiveConstraints?.data,
            residency: policyResult.effectiveConstraints.residency,
          },
        };
      }
      if (policyResult.effectiveConstraints.sensitivity) {
        effectiveConstraints = {
          ...effectiveConstraints,
          data: {
            ...effectiveConstraints?.data,
            sensitivity: policyResult.effectiveConstraints.sensitivity,
          },
        };
      }

      if (policyResult.policiesApplied.length > 0) {
        console.log(`Applied ${policyResult.policiesApplied.length} policy/policies`);
      }
    }

    // Perform resolution
    console.log(`Resolving agent '${agentData.name}@${agentData.version}'...`);
    console.log(`  Requirements: ${agentData.requires.mcp.length} MCP category/categories`);
    console.log(`  Available servers: ${servers.length}`);
    console.log();

    try {
      const { lockfile, explanation } = resolve({
        agent: { ...agentData, constraints: effectiveConstraints },
        servers,
      });

      const outputPath = options.output ?? config.resolve.output;
      const explainPath = options.explainOutput ?? config.resolve.explainOutput;
      const shouldExplain = options.explain ?? config.resolve.alwaysExplain;

      if (options.dryRun) {
        console.log('Dry run - would write:');
        console.log(`  ${outputPath}`);
        if (shouldExplain) {
          console.log(`  ${explainPath}`);
        }
        console.log('\nLockfile preview:');
        console.log(formatLockfile(lockfile));
      } else {
        // Write lockfile
        writeFile(outputPath, formatLockfile(lockfile));
        console.log(`✓ Wrote ${outputPath}`);

        // Write explanation if requested
        if (shouldExplain) {
          writeFile(explainPath, formatExplanation(explanation));
          console.log(`✓ Wrote ${explainPath}`);
        }

        // Send audit log
        const auditWebhook = options.auditWebhook ?? config.audit?.webhook;
        if (auditWebhook) {
          await sendAuditLog(auditWebhook, agentData, lockfile, shouldExplain ? explanation : null);
          console.log('✓ Sent audit log');
        }
      }

      // Print summary
      console.log('\nResolution Summary:');
      for (const server of lockfile.servers) {
        console.log(`  ${server.category}: ${server.serverId}@${server.version}`);
        console.log(`    Scopes: ${server.scopes.join(', ')}`);
      }

      console.log('\n✓ Resolution complete');
    } catch (error) {
      if (error instanceof ResolutionError) {
        console.error(`\n✗ Resolution failed: ${error.message}`);
        console.error('\nRejected candidates:');
        for (const rejected of error.rejectedCandidates) {
          console.error(`  - ${rejected.serverId}@${rejected.version}: ${rejected.reason.message}`);
        }
        process.exit(1);
      }
      throw error;
    }
  });
