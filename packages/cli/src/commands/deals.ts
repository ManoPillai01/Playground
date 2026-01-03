import { Command } from 'commander';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * deals - Commands for IAB Deals API MCP Server
 */
export const dealsCommand = new Command('deals')
  .description('IAB Deals API MCP Server commands');

/**
 * deals serve - Start the MCP server
 */
dealsCommand
  .command('serve')
  .description('Start the IAB Deals API MCP server')
  .option('--stdio', 'Use stdio transport (default)', true)
  .action((options) => {
    const serverPath = join(__dirname, '..', '..', '..', 'deals-mcp-server', 'dist', 'index.js');

    console.log('Starting IAB Deals MCP Server...');
    console.log(`Server path: ${serverPath}`);
    console.log('');
    console.log('The server is running with stdio transport.');
    console.log('Connect your MCP client to this process.');
    console.log('');
    console.log('Available tools:');
    console.log('  - deals_list: List all available deals');
    console.log('  - deals_get: Get a specific deal by ID');
    console.log('  - deals_create: Create a new deal');
    console.log('  - deals_update: Update an existing deal');
    console.log('  - deals_sync: Simulate syncing to a DSP');
    console.log('  - deals_validate: Validate a deal object');
    console.log('  - deals_match: Check if bid request matches deal');
    console.log('  - deals_update_status: Update deal buyer status');
    console.log('');
    console.log('Available resources:');
    console.log('  - deals://catalog: Deal catalog');
    console.log('  - deals://schema: JSON Schema for deals');
    console.log('  - deals://openrtb/pmp: PMP object template');
    console.log('  - deals://stats: Deal statistics');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');

    // Spawn the MCP server
    const child = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (error) => {
      console.error('Failed to start server:', error.message);
      console.error('Make sure to run `npm run build` first.');
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      child.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
    });
  });

/**
 * deals list - List mock deals (for debugging)
 */
dealsCommand
  .command('list')
  .description('List all mock deals (for debugging)')
  .option('--format <format>', 'Output format: json or table', 'table')
  .action(async (options) => {
    // Dynamic import to avoid loading MCP dependencies unless needed
    const { dealsStore } = await import('@agent-resolver/deals-mcp-server');
    const deals = dealsStore.list();

    if (options.format === 'json') {
      console.log(JSON.stringify(deals, null, 2));
    } else {
      console.log('');
      console.log('Available Deals:');
      console.log('================');
      console.log('');

      for (const deal of deals) {
        const status = deal.buyerStatus?.status ?? 'no-status';
        const statusIcon =
          status === 'active' ? '✅' :
          status === 'pending' ? '⏳' :
          status === 'paused' ? '⏸️' :
          status === 'rejected' ? '❌' :
          status === 'expired' ? '⌛' : '❓';

        console.log(`${statusIcon} ${deal.name}`);
        console.log(`   ID: ${deal.id}`);
        console.log(`   Floor: ${deal.terms.bidFloor} ${deal.terms.bidFloorCurrency}`);
        console.log(`   Formats: ${deal.inventory.formats.join(', ')}`);
        console.log(`   Auction: ${deal.terms.auctionType}`);
        if (deal.curation) {
          console.log(`   Curator: ${deal.curation.curatorName}`);
        }
        console.log('');
      }

      console.log(`Total: ${deals.length} deals`);
    }
  });

/**
 * deals info - Show server information
 */
dealsCommand
  .command('info')
  .description('Show information about the deals MCP server')
  .action(() => {
    console.log('');
    console.log('IAB Deals API Mock MCP Server');
    console.log('=============================');
    console.log('');
    console.log('This server implements a mock version of the IAB Tech Lab');
    console.log('Deals API v1.0 specification as an MCP (Model Context Protocol)');
    console.log('server, enabling AI agents to interact with programmatic');
    console.log('advertising deal data.');
    console.log('');
    console.log('Specifications:');
    console.log('  - IAB Deals API v1.0 (December 2025)');
    console.log('  - OpenRTB 2.6 Deal Object');
    console.log('  - Model Context Protocol');
    console.log('');
    console.log('Usage:');
    console.log('  agent deals serve      Start the MCP server');
    console.log('  agent deals list       List mock deals');
    console.log('  agent deals info       Show this information');
    console.log('');
    console.log('Documentation:');
    console.log('  https://iabtechlab.com/standards/dealsapi/');
    console.log('  https://github.com/InteractiveAdvertisingBureau/openrtb2.x');
    console.log('');
  });
