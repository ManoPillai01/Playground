import { Command } from 'commander';
import {
  resolve,
  formatLockfile,
  formatExplanation,
  validateAgentsFrontmatter,
  validateMcpIndex,
  ResolutionError,
} from '@agent-resolver/core';
import { type AgentsFrontmatter, type McpIndex } from '@agent-resolver/schema';
import { readAgentsMd, readMcpIndex, writeFile } from '../utils/files.js';

export const resolveCommand = new Command('resolve')
  .description('Resolve agent requirements and generate agents.lock')
  .option('-a, --agents <path>', 'Path to agents.md file', './agents.md')
  .option('-i, --index <path>', 'Path to mcp.index.json file', './mcp.index.json')
  .option('-o, --output <path>', 'Path to output agents.lock file', './agents.lock')
  .option('-e, --explain', 'Also write agents.resolution.json with explanations')
  .option('--explain-output <path>', 'Path to output agents.resolution.json', './agents.resolution.json')
  .action((options) => {
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

    // Read and validate mcp.index.json
    let servers: McpIndex;
    try {
      const data = readMcpIndex(options.index);
      const result = validateMcpIndex(data);
      if (!result.success) {
        console.error('✗ Invalid mcp.index.json:');
        for (const error of result.errors ?? []) {
          console.error(`  - ${error}`);
        }
        process.exit(1);
      }
      servers = result.data!;
    } catch (error) {
      console.error(`✗ Failed to read mcp.index.json: ${(error as Error).message}`);
      process.exit(1);
    }

    // Perform resolution
    console.log(`Resolving agent '${agentData.name}@${agentData.version}'...`);
    console.log(`  Requirements: ${agentData.requires.mcp.length} MCP category/categories`);
    console.log(`  Available servers: ${servers.length}`);
    console.log();

    try {
      const { lockfile, explanation } = resolve({
        agent: agentData,
        servers,
      });

      // Write lockfile
      writeFile(options.output, formatLockfile(lockfile));
      console.log(`✓ Wrote ${options.output}`);

      // Write explanation if requested
      if (options.explain) {
        writeFile(options.explainOutput, formatExplanation(explanation));
        console.log(`✓ Wrote ${options.explainOutput}`);
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
