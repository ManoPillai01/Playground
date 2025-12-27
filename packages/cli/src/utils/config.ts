import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { AgentConfig } from '@agent-resolver/schema';

const CONFIG_FILES = ['.agentrc.json', '.agentrc', 'agent.config.json'];

/**
 * Find and load .agentrc.json config file
 */
export function loadConfig(dir: string = process.cwd()): AgentConfig | null {
  for (const filename of CONFIG_FILES) {
    const filepath = join(dir, filename);
    if (existsSync(filepath)) {
      try {
        const content = readFileSync(filepath, 'utf-8');
        return JSON.parse(content) as AgentConfig;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Get default config
 */
export function getDefaultConfig(): AgentConfig {
  return {
    registries: [],
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
}

/**
 * Merge config with defaults
 */
export function mergeWithDefaults(config: Partial<AgentConfig> | null): AgentConfig {
  const defaults = getDefaultConfig();
  if (!config) return defaults;

  return {
    registries: config.registries ?? defaults.registries,
    policies: config.policies ?? defaults.policies,
    cache: { ...defaults.cache, ...config.cache },
    resolve: { ...defaults.resolve, ...config.resolve },
    audit: config.audit,
  };
}
