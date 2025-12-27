import { Command } from 'commander';
import { validateAgentsFrontmatter, validateMcpIndex } from '@agent-resolver/core';
import { readAgentsMd, readMcpIndex, fileExists } from '../utils/files.js';

export const validateCommand = new Command('validate')
  .description('Validate agents.md frontmatter and mcp.index.json schemas')
  .option('-a, --agents <path>', 'Path to agents.md file', './agents.md')
  .option('-i, --index <path>', 'Path to mcp.index.json file', './mcp.index.json')
  .action((options) => {
    let hasErrors = false;

    // Validate agents.md
    console.log(`Validating ${options.agents}...`);
    try {
      const { data } = readAgentsMd(options.agents);
      const result = validateAgentsFrontmatter(data);
      if (result.success) {
        console.log('✓ agents.md frontmatter is valid');
      } else {
        console.error('✗ agents.md validation failed:');
        for (const error of result.errors ?? []) {
          console.error(`  - ${error}`);
        }
        hasErrors = true;
      }
    } catch (error) {
      console.error(`✗ Failed to read agents.md: ${(error as Error).message}`);
      hasErrors = true;
    }

    // Validate mcp.index.json if present
    if (fileExists(options.index)) {
      console.log(`Validating ${options.index}...`);
      try {
        const data = readMcpIndex(options.index);
        const result = validateMcpIndex(data);
        if (result.success) {
          console.log('✓ mcp.index.json is valid');
        } else {
          console.error('✗ mcp.index.json validation failed:');
          for (const error of result.errors ?? []) {
            console.error(`  - ${error}`);
          }
          hasErrors = true;
        }
      } catch (error) {
        console.error(`✗ Failed to read mcp.index.json: ${(error as Error).message}`);
        hasErrors = true;
      }
    } else {
      console.log(`ℹ Skipping mcp.index.json validation (file not found: ${options.index})`);
    }

    if (hasErrors) {
      process.exit(1);
    }

    console.log('\nValidation complete.');
  });
