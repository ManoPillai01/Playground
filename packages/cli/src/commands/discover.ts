import { Command } from 'commander';
import { validateMcpIndex } from '@agent-resolver/core';
import { type McpIndex, type McpServer } from '@agent-resolver/schema';
import { readMcpIndex } from '../utils/files.js';

export const discoverCommand = new Command('discover')
  .description('Discover available MCP servers from local index')
  .option('-i, --index <path>', 'Path to mcp.index.json file', './mcp.index.json')
  .action((options) => {
    console.log(`Reading MCP index from ${options.index}...\n`);

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
      console.error(`✗ Failed to read MCP index: ${(error as Error).message}`);
      process.exit(1);
    }

    if (servers.length === 0) {
      console.log('No servers found in index.');
      return;
    }

    // Group servers by category
    const byCategory = new Map<string, McpServer[]>();
    for (const server of servers) {
      for (const category of server.categories) {
        const list = byCategory.get(category) ?? [];
        list.push(server);
        byCategory.set(category, list);
      }
    }

    // Sort categories deterministically
    const sortedCategories = [...byCategory.keys()].sort();

    console.log('Available MCP Servers by Category:\n');
    for (const category of sortedCategories) {
      console.log(`  ${category}:`);
      const categoryServers = byCategory.get(category)!;
      // Sort servers within category
      categoryServers.sort((a, b) => {
        if (a.id !== b.id) return a.id.localeCompare(b.id);
        return a.version.localeCompare(b.version);
      });
      for (const server of categoryServers) {
        const signedBadge = server.trust.signed ? ' [signed]' : '';
        console.log(`    - ${server.id}@${server.version}${signedBadge}`);
        console.log(`      Scopes: ${server.scopes.join(', ') || '(none)'}`);
        console.log(`      Residency: ${server.data.residency.join(', ')}`);
        console.log(`      Max Sensitivity: ${server.data.maxSensitivity}`);
      }
      console.log();
    }

    console.log(`Total: ${servers.length} server(s) in ${sortedCategories.length} category/categories`);
  });
