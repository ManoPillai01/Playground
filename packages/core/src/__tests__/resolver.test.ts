import { describe, it, expect } from 'vitest';
import { resolve, ResolutionError, formatLockfile, formatExplanation } from '../resolver.js';
import type { AgentsFrontmatter, McpIndex } from '@agent-resolver/schema';

// Helper to create a minimal valid server
function createServer(
  overrides: Partial<McpIndex[0]> = {}
): McpIndex[0] {
  return {
    id: 'test-server',
    version: '1.0.0',
    endpoint: 'https://test.com/mcp',
    categories: ['test'],
    scopes: ['read:test'],
    data: {
      residency: ['any'],
      maxSensitivity: 'confidential',
    },
    trust: {
      signed: false,
      publisher: 'Test Publisher',
    },
    ...overrides,
  };
}

// Helper to create a minimal valid agent
function createAgent(
  overrides: Partial<AgentsFrontmatter> = {}
): AgentsFrontmatter {
  return {
    name: 'test-agent',
    version: '1.0.0',
    requires: {
      mcp: [{ category: 'test', permissions: ['read:test'] }],
    },
    ...overrides,
  };
}

describe('resolve', () => {
  describe('residency filtering', () => {
    it('should accept server with matching residency', () => {
      const agent = createAgent({
        constraints: { data: { residency: 'us-only' } },
      });
      const servers: McpIndex = [
        createServer({ data: { residency: ['us-only'], maxSensitivity: 'confidential' } }),
      ];

      const result = resolve({ agent, servers });
      expect(result.lockfile.servers).toHaveLength(1);
      expect(result.lockfile.servers[0].serverId).toBe('test-server');
    });

    it('should accept server with "any" residency', () => {
      const agent = createAgent({
        constraints: { data: { residency: 'us-only' } },
      });
      const servers: McpIndex = [
        createServer({ data: { residency: ['any'], maxSensitivity: 'confidential' } }),
      ];

      const result = resolve({ agent, servers });
      expect(result.lockfile.servers).toHaveLength(1);
    });

    it('should reject server with incompatible residency', () => {
      const agent = createAgent({
        constraints: { data: { residency: 'us-only' } },
      });
      const servers: McpIndex = [
        createServer({ data: { residency: ['eu-only'], maxSensitivity: 'confidential' } }),
      ];

      expect(() => resolve({ agent, servers })).toThrow(ResolutionError);
    });

    it('should include RESIDENCY_MISMATCH in rejection reasons', () => {
      const agent = createAgent({
        constraints: { data: { residency: 'eu-only' } },
      });
      const servers: McpIndex = [
        createServer({
          id: 'us-server',
          data: { residency: ['us-only'], maxSensitivity: 'confidential' },
        }),
        createServer({
          id: 'eu-server',
          data: { residency: ['eu-only'], maxSensitivity: 'confidential' },
        }),
      ];

      const result = resolve({ agent, servers });
      expect(result.explanation.requirements[0].rejected).toContainEqual(
        expect.objectContaining({
          serverId: 'us-server',
          reason: expect.objectContaining({ code: 'RESIDENCY_MISMATCH' }),
        })
      );
    });
  });

  describe('sensitivity filtering', () => {
    it('should accept server with sufficient maxSensitivity', () => {
      const agent = createAgent({
        constraints: { data: { sensitivity: 'internal' } },
      });
      const servers: McpIndex = [
        createServer({ data: { residency: ['any'], maxSensitivity: 'confidential' } }),
      ];

      const result = resolve({ agent, servers });
      expect(result.lockfile.servers).toHaveLength(1);
    });

    it('should reject server with insufficient maxSensitivity', () => {
      const agent = createAgent({
        constraints: { data: { sensitivity: 'pii.high' } },
      });
      const servers: McpIndex = [
        createServer({ data: { residency: ['any'], maxSensitivity: 'public' } }),
      ];

      expect(() => resolve({ agent, servers })).toThrow(ResolutionError);
    });

    it('should include SENSITIVITY_EXCEEDED in rejection reasons', () => {
      const agent = createAgent({
        constraints: { data: { sensitivity: 'pii.moderate' } },
      });
      const servers: McpIndex = [
        createServer({
          id: 'low-sensitivity',
          data: { residency: ['any'], maxSensitivity: 'internal' },
        }),
        createServer({
          id: 'high-sensitivity',
          data: { residency: ['any'], maxSensitivity: 'pii.high' },
        }),
      ];

      const result = resolve({ agent, servers });
      expect(result.explanation.requirements[0].rejected).toContainEqual(
        expect.objectContaining({
          serverId: 'low-sensitivity',
          reason: expect.objectContaining({ code: 'SENSITIVITY_EXCEEDED' }),
        })
      );
    });
  });

  describe('scope subset matching', () => {
    it('should accept server with all required scopes', () => {
      const agent = createAgent({
        requires: {
          mcp: [{ category: 'test', permissions: ['read:test', 'write:test'] }],
        },
      });
      const servers: McpIndex = [
        createServer({ scopes: ['read:test', 'write:test', 'delete:test'] }),
      ];

      const result = resolve({ agent, servers });
      expect(result.lockfile.servers).toHaveLength(1);
    });

    it('should reject server with missing scopes', () => {
      const agent = createAgent({
        requires: {
          mcp: [{ category: 'test', permissions: ['read:test', 'write:test'] }],
        },
      });
      const servers: McpIndex = [
        createServer({ scopes: ['read:test'] }),
      ];

      expect(() => resolve({ agent, servers })).toThrow(ResolutionError);
    });

    it('should include MISSING_SCOPE in rejection reasons', () => {
      const agent = createAgent({
        requires: {
          mcp: [{ category: 'test', permissions: ['read:test', 'admin:test'] }],
        },
      });
      const servers: McpIndex = [
        createServer({ id: 'partial-scopes', scopes: ['read:test'] }),
        createServer({ id: 'full-scopes', scopes: ['read:test', 'admin:test'] }),
      ];

      const result = resolve({ agent, servers });
      expect(result.explanation.requirements[0].rejected).toContainEqual(
        expect.objectContaining({
          serverId: 'partial-scopes',
          reason: expect.objectContaining({ code: 'MISSING_SCOPE' }),
        })
      );
    });
  });

  describe('deterministic tie-break selection', () => {
    it('should prefer signed servers over unsigned', () => {
      const agent = createAgent();
      const servers: McpIndex = [
        createServer({ id: 'aaa-unsigned', trust: { signed: false, publisher: 'A' } }),
        createServer({ id: 'zzz-signed', trust: { signed: true, publisher: 'Z' } }),
      ];

      const result = resolve({ agent, servers });
      expect(result.lockfile.servers[0].serverId).toBe('zzz-signed');
    });

    it('should use lexicographic id ordering when signed status is equal', () => {
      const agent = createAgent();
      const servers: McpIndex = [
        createServer({ id: 'charlie', trust: { signed: true, publisher: 'C' } }),
        createServer({ id: 'alpha', trust: { signed: true, publisher: 'A' } }),
        createServer({ id: 'bravo', trust: { signed: true, publisher: 'B' } }),
      ];

      const result = resolve({ agent, servers });
      expect(result.lockfile.servers[0].serverId).toBe('alpha');
    });

    it('should use lexicographic version when id is equal', () => {
      const agent = createAgent();
      const servers: McpIndex = [
        createServer({ id: 'server', version: '2.0.0', trust: { signed: true, publisher: 'X' } }),
        createServer({ id: 'server', version: '1.0.0', trust: { signed: true, publisher: 'X' } }),
        createServer({ id: 'server', version: '1.5.0', trust: { signed: true, publisher: 'X' } }),
      ];

      const result = resolve({ agent, servers });
      expect(result.lockfile.servers[0].version).toBe('1.0.0');
    });
  });

  describe('stable lockfile output ordering', () => {
    it('should produce identical output for same input', () => {
      const agent = createAgent({
        requires: {
          mcp: [
            { category: 'zebra', permissions: ['read:zebra'] },
            { category: 'alpha', permissions: ['read:alpha'] },
          ],
        },
      });
      const servers: McpIndex = [
        createServer({ id: 'zebra-server', categories: ['zebra'], scopes: ['read:zebra'] }),
        createServer({ id: 'alpha-server', categories: ['alpha'], scopes: ['read:alpha'] }),
      ];

      const result1 = resolve({ agent, servers });
      const result2 = resolve({ agent, servers });

      // Compare lockfile output (excluding timestamp)
      const lockfile1 = { ...result1.lockfile, resolvedAt: 'fixed' };
      const lockfile2 = { ...result2.lockfile, resolvedAt: 'fixed' };
      expect(JSON.stringify(lockfile1)).toBe(JSON.stringify(lockfile2));
    });

    it('should sort servers by category in lockfile', () => {
      const agent = createAgent({
        requires: {
          mcp: [
            { category: 'zebra', permissions: ['read:zebra'] },
            { category: 'alpha', permissions: ['read:alpha'] },
            { category: 'middle', permissions: ['read:middle'] },
          ],
        },
      });
      const servers: McpIndex = [
        createServer({ id: 'zebra-server', categories: ['zebra'], scopes: ['read:zebra'] }),
        createServer({ id: 'alpha-server', categories: ['alpha'], scopes: ['read:alpha'] }),
        createServer({ id: 'middle-server', categories: ['middle'], scopes: ['read:middle'] }),
      ];

      const result = resolve({ agent, servers });
      const categories = result.lockfile.servers.map((s: { category: string }) => s.category);
      expect(categories).toEqual(['alpha', 'middle', 'zebra']);
    });

    it('should sort scopes alphabetically in lockfile', () => {
      const agent = createAgent({
        requires: {
          mcp: [{ category: 'test', permissions: ['write:test', 'admin:test', 'read:test'] }],
        },
      });
      const servers: McpIndex = [
        createServer({ scopes: ['read:test', 'write:test', 'admin:test', 'delete:test'] }),
      ];

      const result = resolve({ agent, servers });
      expect(result.lockfile.servers[0].scopes).toEqual(['admin:test', 'read:test', 'write:test']);
    });
  });

  describe('formatLockfile', () => {
    it('should end with newline', () => {
      const agent = createAgent();
      const servers: McpIndex = [createServer()];

      const result = resolve({ agent, servers });
      const formatted = formatLockfile(result.lockfile);
      expect(formatted.endsWith('\n')).toBe(true);
    });
  });

  describe('formatExplanation', () => {
    it('should end with newline', () => {
      const agent = createAgent();
      const servers: McpIndex = [createServer()];

      const result = resolve({ agent, servers });
      const formatted = formatExplanation(result.explanation);
      expect(formatted.endsWith('\n')).toBe(true);
    });
  });

  describe('MISSING_CATEGORY rejection', () => {
    it('should reject servers without required category', () => {
      const agent = createAgent({
        requires: {
          mcp: [{ category: 'special', permissions: ['read:special'] }],
        },
      });
      const servers: McpIndex = [
        createServer({ id: 'wrong-category', categories: ['other'], scopes: ['read:special'] }),
        createServer({ id: 'right-category', categories: ['special'], scopes: ['read:special'] }),
      ];

      const result = resolve({ agent, servers });
      expect(result.explanation.requirements[0].rejected).toContainEqual(
        expect.objectContaining({
          serverId: 'wrong-category',
          reason: expect.objectContaining({ code: 'MISSING_CATEGORY' }),
        })
      );
    });
  });
});
