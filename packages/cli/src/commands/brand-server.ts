import { Command } from 'commander';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import {
  createBrandCheckResponse,
  createAuditEntry,
  validateBrandProfile,
  validateBrandCheckRequest,
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
  return JSON.parse(content);
}

/**
 * Write JSON to file
 */
function writeJsonFile(path: string, data: unknown): void {
  const { writeFileSync } = require('fs');
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
 * Append audit entry
 */
function appendAuditEntry(path: string, entry: BrandCheckAuditEntry): void {
  let entries: BrandCheckAuditEntry[] = [];
  if (existsSync(path)) {
    try {
      const content = readFileSync(path, 'utf-8');
      entries = JSON.parse(content);
    } catch {
      entries = [];
    }
  }
  entries.push(entry);
  writeJsonFile(path, entries);
}

/**
 * Parse request body
 */
async function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Create the HTTP request handler
 */
function createHandler(profilePath: string, config: BrandConfig) {
  // Pre-load profile for validation
  let profile: BrandProfile;
  try {
    profile = loadBrandProfile(profilePath);
  } catch (error) {
    console.error(`✗ Failed to load brand profile: ${(error as Error).message}`);
    process.exit(1);
  }

  console.log(`📋 Loaded brand profile: ${profile.name} v${profile.version}`);

  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      sendJson(res, 200, {
        status: 'ok',
        profile: {
          name: profile.name,
          version: profile.version,
        },
      });
      return;
    }

    // Brand check endpoint
    if (url.pathname === '/on-brand/check' && req.method === 'POST') {
      try {
        // Reload profile on each request to pick up changes
        try {
          profile = loadBrandProfile(profilePath);
        } catch (error) {
          sendJson(res, 500, {
            error: 'Failed to load brand profile',
            message: (error as Error).message,
          });
          return;
        }

        // Parse request body
        const body = await parseBody(req);
        let requestData: unknown;
        try {
          requestData = JSON.parse(body);
        } catch {
          sendJson(res, 400, {
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON',
          });
          return;
        }

        // Validate request
        const requestResult = validateBrandCheckRequest(requestData);
        if (!requestResult.success) {
          sendJson(res, 400, {
            error: 'Invalid request',
            details: requestResult.errors,
          });
          return;
        }

        // Perform brand check
        const response = createBrandCheckResponse(profile, requestResult.data);

        // Log audit entry if enabled
        if (config.auditEnabled) {
          try {
            const entry = createAuditEntry(profile, response);
            appendAuditEntry(config.auditPath, entry);
          } catch (error) {
            console.error(`Warning: Failed to write audit log: ${(error as Error).message}`);
          }
        }

        // Log request
        const statusIcon = response.status === 'on-brand' ? '✅'
          : response.status === 'borderline' ? '⚠️'
          : '❌';
        console.log(`${statusIcon} ${new Date().toISOString()} - ${response.status} (${response.confidence}%)`);

        sendJson(res, 200, response);
        return;
      } catch (error) {
        console.error('Error processing request:', error);
        sendJson(res, 500, {
          error: 'Internal server error',
          message: (error as Error).message,
        });
        return;
      }
    }

    // 404 for unknown routes
    sendJson(res, 404, {
      error: 'Not found',
      message: `Unknown endpoint: ${req.method} ${url.pathname}`,
      availableEndpoints: {
        'POST /on-brand/check': 'Check content for brand consistency',
        'GET /health': 'Health check',
      },
    });
  };
}

/**
 * brand serve - Start the brand check API server
 */
export const brandServeCommand = new Command('serve')
  .description('Start the brand check API server')
  .option('-p, --profile <path>', 'Path to brand profile', DEFAULT_PROFILE_PATH)
  .option('--port <number>', 'Server port', '3000')
  .option('--host <string>', 'Server host', 'localhost')
  .action((options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const config = loadBrandConfig();

    // Check if profile exists
    if (!existsSync(options.profile)) {
      console.error(`✗ Brand profile not found: ${options.profile}`);
      console.error('  Run `agent brand init` to create one');
      process.exit(1);
    }

    const handler = createHandler(options.profile, config);
    const server = createServer(handler);

    server.listen(port, host, () => {
      console.log(`\n🚀 Brand Check API Server running at http://${host}:${port}`);
      console.log('\nEndpoints:');
      console.log(`  POST http://${host}:${port}/on-brand/check`);
      console.log(`  GET  http://${host}:${port}/health`);
      console.log('\nExample request:');
      console.log(`  curl -X POST http://${host}:${port}/on-brand/check \\`);
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -d \'{"content": "Your content to check"}\'');
      console.log('\nPress Ctrl+C to stop\n');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down server...');
      server.close(() => {
        console.log('Server stopped.');
        process.exit(0);
      });
    });
  });
