import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { brandServeCommand } from './brand-server.js';
import {
  createBrandCheckResponse,
  createAuditEntry,
  validateBrandProfile,
  validateBrandCheckRequest,
  formatStatusDisplay,
} from '@agent-resolver/core';
import {
  BrandProfile,
  BrandConfig,
  BrandCheckAuditEntry,
} from '@agent-resolver/schema';

const DEFAULT_PROFILE_PATH = './brand-profile.json';
const DEFAULT_CONFIG_PATH = './.brandrc.json';
const DEFAULT_AUDIT_PATH = './brand-audit.json';

/**
 * Read and parse JSON file
 */
function readJsonFile(path: string): unknown {
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  const content = readFileSync(path, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in file: ${path}`);
  }
}

/**
 * Write JSON to file with LF newlines
 */
function writeJsonFile(path: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(path, content.replace(/\r\n/g, '\n'), 'utf-8');
}

/**
 * Load brand configuration
 */
function loadBrandConfig(): BrandConfig {
  if (existsSync(DEFAULT_CONFIG_PATH)) {
    const data = readJsonFile(DEFAULT_CONFIG_PATH);
    const result = BrandConfig.safeParse(data);
    if (result.success) {
      return result.data;
    }
  }
  return BrandConfig.parse({});
}

/**
 * Load brand profile
 */
function loadBrandProfile(path: string): BrandProfile {
  const data = readJsonFile(path);
  const result = validateBrandProfile(data);
  if (!result.success) {
    throw new Error(`Invalid brand profile:\n  ${result.errors.join('\n  ')}`);
  }
  return result.data;
}

/**
 * Append audit entry to audit log
 */
function appendAuditEntry(path: string, entry: BrandCheckAuditEntry): void {
  let entries: BrandCheckAuditEntry[] = [];

  if (existsSync(path)) {
    try {
      const content = readFileSync(path, 'utf-8');
      entries = JSON.parse(content);
    } catch {
      // Start fresh if file is corrupted
      entries = [];
    }
  }

  entries.push(entry);
  writeJsonFile(path, entries);
}

/**
 * brand init - Initialize a new brand profile
 */
export const brandInitCommand = new Command('init')
  .description('Initialize a new brand profile')
  .option('-o, --output <path>', 'Output path for brand profile', DEFAULT_PROFILE_PATH)
  .option('-n, --name <name>', 'Brand name', 'My Brand')
  .action((options) => {
    if (existsSync(options.output)) {
      console.error(`✗ Brand profile already exists at ${options.output}`);
      console.error('  Use --output to specify a different path');
      process.exit(1);
    }

    const profile: BrandProfile = {
      name: options.name,
      version: '1.0.0',
      values: [
        'Quality',
        'Innovation',
        'Trust',
        'Customer-first',
        'Integrity',
      ],
      voiceDescriptors: [
        'professional',
        'friendly',
        'clear',
        'confident',
      ],
      toneAcceptable: [
        'helpful',
        'encouraging',
        'informative',
      ],
      toneUnacceptable: [
        'aggressive',
        'condescending',
        'dismissive',
      ],
      neverRules: [
        'competitor names',
        'profanity',
        'unverified claims',
      ],
      examples: [
        {
          content: 'We help you succeed with innovative solutions designed around your needs.',
          type: 'good',
          note: 'Customer-focused, confident tone',
        },
        {
          content: 'Our competitors are terrible. Buy from us or regret it!',
          type: 'bad',
          note: 'Aggressive, mentions competitors',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    writeJsonFile(options.output, profile);
    console.log(`✓ Brand profile created at ${options.output}`);
    console.log('\nNext steps:');
    console.log('  1. Edit the profile to match your brand guidelines');
    console.log('  2. Run `agent brand check --content "Your content"` to test');
  });

/**
 * brand check - Check content against brand profile
 */
export const brandCheckCommand = new Command('check')
  .description('Check content against the brand profile')
  .option('-p, --profile <path>', 'Path to brand profile', DEFAULT_PROFILE_PATH)
  .option('-c, --content <text>', 'Content to check')
  .option('-f, --file <path>', 'Read content from file')
  .option('-t, --type <type>', 'Content type (ad-copy, social-post, etc.)')
  .option('--json', 'Output as JSON')
  .option('--no-audit', 'Disable audit logging')
  .action((options) => {
    // Get content from either --content or --file
    let content: string;
    if (options.content) {
      content = options.content;
    } else if (options.file) {
      if (!existsSync(options.file)) {
        console.error(`✗ Content file not found: ${options.file}`);
        process.exit(1);
      }
      content = readFileSync(options.file, 'utf-8');
    } else {
      console.error('✗ Please provide content using --content or --file');
      process.exit(1);
    }

    // Load profile
    let profile: BrandProfile;
    try {
      profile = loadBrandProfile(options.profile);
    } catch (error) {
      console.error(`✗ ${(error as Error).message}`);
      process.exit(1);
    }

    // Validate request
    const requestResult = validateBrandCheckRequest({
      content,
      contentType: options.type,
    });

    if (!requestResult.success) {
      console.error('✗ Invalid request:');
      for (const error of requestResult.errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }

    // Perform brand check
    const response = createBrandCheckResponse(profile, requestResult.data);

    // Log audit entry if enabled
    const config = loadBrandConfig();
    if (options.audit && config.auditEnabled) {
      const entry = createAuditEntry(profile, response);
      try {
        appendAuditEntry(config.auditPath, entry);
      } catch (error) {
        console.error(`Warning: Failed to write audit log: ${(error as Error).message}`);
      }
    }

    // Output result
    if (options.json) {
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log('\n' + '─'.repeat(50));
      console.log(`  ${response.statusDisplay}`);
      console.log('─'.repeat(50));
      console.log('\nExplanation:');
      for (const explanation of response.explanations) {
        const icon = explanation.severity === 'critical' ? '❌'
          : explanation.severity === 'warning' ? '⚠️'
          : 'ℹ️';
        console.log(`  ${icon} ${explanation.text}`);
      }
      if (response.confidence !== undefined) {
        console.log(`\nConfidence: ${response.confidence}%`);
      }
      console.log(`Profile: ${profile.name} v${response.profileVersion}`);
      console.log('');
    }

    // Exit with appropriate code
    if (response.status === 'off-brand') {
      process.exit(1);
    }
  });

/**
 * brand profile - View or validate brand profile
 */
export const brandProfileCommand = new Command('profile')
  .description('View or validate brand profile')
  .option('-p, --profile <path>', 'Path to brand profile', DEFAULT_PROFILE_PATH)
  .option('--validate', 'Only validate, do not display')
  .action((options) => {
    let profile: BrandProfile;
    try {
      profile = loadBrandProfile(options.profile);
    } catch (error) {
      console.error(`✗ ${(error as Error).message}`);
      process.exit(1);
    }

    if (options.validate) {
      console.log(`✓ Brand profile is valid: ${profile.name} v${profile.version}`);
      return;
    }

    console.log(`\n📋 Brand Profile: ${profile.name}`);
    console.log(`   Version: ${profile.version}`);
    if (profile.description) {
      console.log(`   Description: ${profile.description}`);
    }

    console.log('\n🎯 Values:');
    for (const value of profile.values) {
      console.log(`   • ${value}`);
    }

    console.log('\n🗣️  Voice Descriptors:');
    for (const descriptor of profile.voiceDescriptors) {
      console.log(`   • ${descriptor}`);
    }

    if (profile.toneAcceptable.length > 0) {
      console.log('\n✅ Acceptable Tone:');
      for (const tone of profile.toneAcceptable) {
        console.log(`   • ${tone}`);
      }
    }

    if (profile.toneUnacceptable.length > 0) {
      console.log('\n❌ Unacceptable Tone:');
      for (const tone of profile.toneUnacceptable) {
        console.log(`   • ${tone}`);
      }
    }

    if (profile.neverRules.length > 0) {
      console.log('\n🚫 Never Rules:');
      for (const rule of profile.neverRules) {
        console.log(`   • ${rule}`);
      }
    }

    if (profile.examples.length > 0) {
      console.log('\n📝 Examples:');
      for (const example of profile.examples) {
        const icon = example.type === 'good' ? '✓' : '✗';
        console.log(`   ${icon} "${example.content.substring(0, 60)}${example.content.length > 60 ? '...' : ''}"`);
        if (example.note) {
          console.log(`     └─ ${example.note}`);
        }
      }
    }

    console.log('');
  });

/**
 * brand audit - View audit log
 */
export const brandAuditCommand = new Command('audit')
  .description('View brand check audit log')
  .option('-p, --path <path>', 'Path to audit log', DEFAULT_AUDIT_PATH)
  .option('-n, --limit <number>', 'Number of recent entries to show', '10')
  .option('--json', 'Output as JSON')
  .action((options) => {
    if (!existsSync(options.path)) {
      console.log('No audit log found. Run brand checks to generate entries.');
      return;
    }

    let entries: BrandCheckAuditEntry[];
    try {
      const content = readFileSync(options.path, 'utf-8');
      entries = JSON.parse(content);
    } catch (error) {
      console.error(`✗ Failed to read audit log: ${(error as Error).message}`);
      process.exit(1);
    }

    const limit = parseInt(options.limit, 10);
    const recent = entries.slice(-limit);

    if (options.json) {
      console.log(JSON.stringify(recent, null, 2));
      return;
    }

    console.log(`\n📊 Brand Check Audit Log (${recent.length} of ${entries.length} entries)\n`);

    for (const entry of recent) {
      const statusIcon = entry.status === 'on-brand' ? '✅'
        : entry.status === 'borderline' ? '⚠️'
        : '❌';
      const date = new Date(entry.timestamp).toLocaleString();
      console.log(`${statusIcon} ${date}`);
      console.log(`   Profile: ${entry.profileName} v${entry.profileVersion}`);
      console.log(`   Content: ${entry.contentHash.substring(0, 16)}...`);
      if (entry.confidence !== undefined) {
        console.log(`   Confidence: ${entry.confidence}%`);
      }
      console.log('');
    }

    // Summary statistics
    const onBrand = entries.filter(e => e.status === 'on-brand').length;
    const borderline = entries.filter(e => e.status === 'borderline').length;
    const offBrand = entries.filter(e => e.status === 'off-brand').length;

    console.log('─'.repeat(40));
    console.log(`Summary: ✅ ${onBrand} | ⚠️  ${borderline} | ❌ ${offBrand}`);
    console.log('');
  });

/**
 * Main brand command
 */
export const brandCommand = new Command('brand')
  .description('Brand consistency checker - Is this on brand?')
  .addCommand(brandInitCommand)
  .addCommand(brandCheckCommand)
  .addCommand(brandProfileCommand)
  .addCommand(brandAuditCommand)
  .addCommand(brandServeCommand);
