#!/usr/bin/env node
import { Command } from 'commander';
import { validateCommand } from './commands/validate.js';
import { discoverCommand } from './commands/discover.js';
import { resolveCommand } from './commands/resolve.js';
import { syncCommand, syncStatusCommand } from './commands/sync.js';
import { policyCommand } from './commands/policy.js';
import { configCommand } from './commands/config.js';
import { brandCommand } from './commands/brand.js';
import { dealsCommand } from './commands/deals.js';

const program = new Command();

program
  .name('agent')
  .description('Deterministic Agent Resolver CLI')
  .version('0.1.0');

program.addCommand(validateCommand);
program.addCommand(discoverCommand);
program.addCommand(resolveCommand);
program.addCommand(syncCommand);
program.addCommand(policyCommand);
program.addCommand(configCommand);
program.addCommand(brandCommand);
program.addCommand(dealsCommand);

// Add sync status as subcommand
syncCommand.addCommand(syncStatusCommand);

program.parse();
