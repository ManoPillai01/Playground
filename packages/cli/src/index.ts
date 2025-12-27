#!/usr/bin/env node
import { Command } from 'commander';
import { validateCommand } from './commands/validate.js';
import { discoverCommand } from './commands/discover.js';
import { resolveCommand } from './commands/resolve.js';

const program = new Command();

program
  .name('agent')
  .description('Deterministic Agent Resolver CLI')
  .version('0.1.0');

program.addCommand(validateCommand);
program.addCommand(discoverCommand);
program.addCommand(resolveCommand);

program.parse();
