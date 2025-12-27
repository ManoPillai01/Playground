import { describe, it, expect } from 'vitest';
import { validateAgentsFrontmatter, validateMcpIndex } from '../validate.js';

describe('validateAgentsFrontmatter', () => {
  it('should accept valid frontmatter', () => {
    const data = {
      name: 'test-agent',
      version: '1.0.0',
      requires: {
        mcp: [{ category: 'test', permissions: ['read:test'] }],
      },
    };

    const result = validateAgentsFrontmatter(data);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should accept valid frontmatter with constraints', () => {
    const data = {
      name: 'test-agent',
      version: '1.0.0',
      requires: {
        mcp: [{ category: 'test', permissions: ['read:test'] }],
      },
      constraints: {
        data: {
          sensitivity: 'internal',
          residency: 'us-only',
        },
        actions: {
          forbid: ['delete'],
        },
      },
    };

    const result = validateAgentsFrontmatter(data);
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const data = {
      version: '1.0.0',
      requires: {
        mcp: [{ category: 'test', permissions: ['read:test'] }],
      },
    };

    const result = validateAgentsFrontmatter(data);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.some((e) => e.includes('name'))).toBe(true);
  });

  it('should reject missing version', () => {
    const data = {
      name: 'test-agent',
      requires: {
        mcp: [{ category: 'test', permissions: ['read:test'] }],
      },
    };

    const result = validateAgentsFrontmatter(data);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('version'))).toBe(true);
  });

  it('should reject missing requires', () => {
    const data = {
      name: 'test-agent',
      version: '1.0.0',
    };

    const result = validateAgentsFrontmatter(data);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('requires'))).toBe(true);
  });

  it('should reject invalid sensitivity level', () => {
    const data = {
      name: 'test-agent',
      version: '1.0.0',
      requires: {
        mcp: [{ category: 'test', permissions: ['read:test'] }],
      },
      constraints: {
        data: {
          sensitivity: 'super-secret', // invalid
        },
      },
    };

    const result = validateAgentsFrontmatter(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid residency level', () => {
    const data = {
      name: 'test-agent',
      version: '1.0.0',
      requires: {
        mcp: [{ category: 'test', permissions: ['read:test'] }],
      },
      constraints: {
        data: {
          residency: 'mars-only', // invalid
        },
      },
    };

    const result = validateAgentsFrontmatter(data);
    expect(result.success).toBe(false);
  });
});

describe('validateMcpIndex', () => {
  it('should accept valid MCP index', () => {
    const data = [
      {
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
          signed: true,
          publisher: 'Test Corp',
        },
      },
    ];

    const result = validateMcpIndex(data);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('should accept empty array', () => {
    const result = validateMcpIndex([]);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it('should accept MCP index with optional policy', () => {
    const data = [
      {
        id: 'test-server',
        version: '1.0.0',
        endpoint: 'https://test.com/mcp',
        categories: ['test'],
        scopes: ['read:test'],
        data: {
          residency: ['us-only'],
          maxSensitivity: 'pii.low',
        },
        trust: {
          signed: false,
          publisher: 'Test Corp',
        },
        policy: {
          rateLimitPerMin: 100,
        },
      },
    ];

    const result = validateMcpIndex(data);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const data = [
      {
        id: 'test-server',
        // missing version, endpoint, etc.
      },
    ];

    const result = validateMcpIndex(data);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should reject invalid residency values', () => {
    const data = [
      {
        id: 'test-server',
        version: '1.0.0',
        endpoint: 'https://test.com/mcp',
        categories: ['test'],
        scopes: ['read:test'],
        data: {
          residency: ['mars-only'], // invalid
          maxSensitivity: 'confidential',
        },
        trust: {
          signed: true,
          publisher: 'Test Corp',
        },
      },
    ];

    const result = validateMcpIndex(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid maxSensitivity', () => {
    const data = [
      {
        id: 'test-server',
        version: '1.0.0',
        endpoint: 'https://test.com/mcp',
        categories: ['test'],
        scopes: ['read:test'],
        data: {
          residency: ['any'],
          maxSensitivity: 'ultra-secret', // invalid
        },
        trust: {
          signed: true,
          publisher: 'Test Corp',
        },
      },
    ];

    const result = validateMcpIndex(data);
    expect(result.success).toBe(false);
  });
});
