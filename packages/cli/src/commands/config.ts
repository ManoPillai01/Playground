import { Command } from 'commander';
import { writeFileSync, existsSync } from 'fs';
import { loadConfig, getDefaultConfig } from '../utils/config.js';

export const configCommand = new Command('config')
  .description('Configuration management');

configCommand
  .command('init')
  .description('Create a new .agentrc.json config file')
  .option('-f, --force', 'Overwrite existing config')
  .action((options) => {
    const configPath = '.agentrc.json';

    if (existsSync(configPath) && !options.force) {
      console.error('Config file already exists. Use --force to overwrite.');
      process.exit(1);
    }

    const config = {
      registries: [
        {
          name: 'local',
          type: 'file',
          path: './mcp.index.json',
        },
      ],
      policies: [],
      cache: {
        path: '.agent-cache',
        ttl: 3600,
      },
      resolve: {
        output: './agents.lock',
        explainOutput: './agents.resolution.json',
        alwaysExplain: false,
      },
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`✓ Created ${configPath}`);
    console.log('\nEdit the file to add git registries and policies.');
  });

configCommand
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig();

    if (!config) {
      console.log('No config file found.');
      console.log('Run `agent config init` to create one.');
      return;
    }

    console.log(JSON.stringify(config, null, 2));
  });

configCommand
  .command('path')
  .description('Show config file path')
  .action(() => {
    const paths = ['.agentrc.json', '.agentrc', 'agent.config.json'];
    for (const p of paths) {
      if (existsSync(p)) {
        console.log(p);
        return;
      }
    }
    console.log('(no config file)');
  });
