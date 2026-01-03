#!/usr/bin/env node
import { Command } from 'commander';
import { startServer } from './server.js';
import { dealsStore } from './store/deals-store.js';

const program = new Command();

program
  .name('deals-mcp-server')
  .description('IAB Deals API Mock MCP Server')
  .version('0.1.0');

program
  .command('start')
  .description('Start the MCP server with stdio transport')
  .action(async () => {
    console.error('Starting IAB Deals MCP Server...');
    console.error(`Loaded ${dealsStore.count()} mock deals`);
    await startServer();
  });

program
  .command('list')
  .description('List all available deals (for debugging)')
  .action(() => {
    const deals = dealsStore.list();
    console.log(JSON.stringify(deals, null, 2));
  });

program
  .command('reset')
  .description('Reset the deals store to initial mock data')
  .action(() => {
    dealsStore.reset();
    console.log(`Reset complete. ${dealsStore.count()} deals loaded.`);
  });

// Default action: start the server
if (process.argv.length === 2) {
  console.error('Starting IAB Deals MCP Server...');
  console.error(`Loaded ${dealsStore.count()} mock deals`);
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} else {
  program.parse();
}

// Export for programmatic use
export { createServer, startServer } from './server.js';
export { dealsStore, DealsStore } from './store/deals-store.js';
export { allTools } from './tools/index.js';
export { allResources } from './resources/index.js';
