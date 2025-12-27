import { Command } from 'commander';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, mergeWithDefaults } from '../utils/config.js';

export const syncCommand = new Command('sync')
  .description('Sync registries from git repositories')
  .option('-c, --cache <path>', 'Cache directory path')
  .option('--registry <name>', 'Sync only specific registry')
  .action((options) => {
    const config = mergeWithDefaults(loadConfig());
    const cachePath = options.cache ?? config.cache.path;

    // Ensure cache directory exists
    if (!existsSync(cachePath)) {
      mkdirSync(cachePath, { recursive: true });
    }

    const gitRegistries = config.registries.filter((r) => r.type === 'git');

    if (gitRegistries.length === 0) {
      console.log('No git registries configured.');
      console.log('Add registries to .agentrc.json:');
      console.log(JSON.stringify({
        registries: [{
          name: 'org',
          type: 'git',
          url: 'git@github.com:myorg/mcp-registry.git',
          branch: 'main',
          path: 'servers/',
        }],
      }, null, 2));
      return;
    }

    for (const registry of gitRegistries) {
      if (options.registry && registry.name !== options.registry) {
        continue;
      }

      console.log(`Syncing registry '${registry.name}'...`);

      const repoDir = join(cachePath, registry.name);

      try {
        if (existsSync(join(repoDir, '.git'))) {
          // Pull latest
          console.log(`  Pulling latest from ${registry.branch}...`);
          execSync(`git -C "${repoDir}" fetch origin ${registry.branch}`, { stdio: 'pipe' });
          execSync(`git -C "${repoDir}" reset --hard origin/${registry.branch}`, { stdio: 'pipe' });
        } else {
          // Clone
          console.log(`  Cloning ${registry.url}...`);
          execSync(
            `git clone --depth 1 --branch ${registry.branch} "${registry.url}" "${repoDir}"`,
            { stdio: 'pipe' }
          );
        }

        // Get commit info
        const commit = execSync(`git -C "${repoDir}" rev-parse --short HEAD`, { encoding: 'utf-8' }).trim();
        const date = execSync(`git -C "${repoDir}" log -1 --format=%ci`, { encoding: 'utf-8' }).trim();

        console.log(`  ✓ Synced to ${commit} (${date})`);

        // Write manifest
        const manifest = {
          name: registry.name,
          url: registry.url,
          branch: registry.branch,
          commit,
          syncedAt: new Date().toISOString(),
        };
        writeFileSync(join(repoDir, '.sync-manifest.json'), JSON.stringify(manifest, null, 2));

      } catch (error) {
        console.error(`  ✗ Failed to sync: ${(error as Error).message}`);
        process.exit(1);
      }
    }

    console.log('\n✓ Sync complete');
  });

export const syncStatusCommand = new Command('status')
  .description('Show sync status of registries')
  .action(() => {
    const config = mergeWithDefaults(loadConfig());
    const cachePath = config.cache.path;

    console.log('Registry Status:\n');

    for (const registry of config.registries) {
      const repoDir = join(cachePath, registry.name);
      const manifestPath = join(repoDir, '.sync-manifest.json');

      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        console.log(`  ${registry.name}:`);
        console.log(`    Type: ${registry.type}`);
        console.log(`    Commit: ${manifest.commit}`);
        console.log(`    Synced: ${manifest.syncedAt}`);
      } else {
        console.log(`  ${registry.name}: (not synced)`);
      }
      console.log();
    }
  });
