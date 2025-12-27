import { describe, it, expect } from 'vitest';
import { computeServerHash } from '../hash.js';

describe('computeServerHash', () => {
  it('should produce consistent hash for same inputs', () => {
    const hash1 = computeServerHash('server-id', '1.0.0', 'https://endpoint.com', ['read', 'write']);
    const hash2 = computeServerHash('server-id', '1.0.0', 'https://endpoint.com', ['read', 'write']);
    expect(hash1).toBe(hash2);
  });

  it('should sort scopes before hashing', () => {
    const hash1 = computeServerHash('server-id', '1.0.0', 'https://endpoint.com', ['write', 'read']);
    const hash2 = computeServerHash('server-id', '1.0.0', 'https://endpoint.com', ['read', 'write']);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different id', () => {
    const hash1 = computeServerHash('server-a', '1.0.0', 'https://endpoint.com', ['read']);
    const hash2 = computeServerHash('server-b', '1.0.0', 'https://endpoint.com', ['read']);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash for different version', () => {
    const hash1 = computeServerHash('server-id', '1.0.0', 'https://endpoint.com', ['read']);
    const hash2 = computeServerHash('server-id', '2.0.0', 'https://endpoint.com', ['read']);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash for different endpoint', () => {
    const hash1 = computeServerHash('server-id', '1.0.0', 'https://a.com', ['read']);
    const hash2 = computeServerHash('server-id', '1.0.0', 'https://b.com', ['read']);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash for different scopes', () => {
    const hash1 = computeServerHash('server-id', '1.0.0', 'https://endpoint.com', ['read']);
    const hash2 = computeServerHash('server-id', '1.0.0', 'https://endpoint.com', ['read', 'write']);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce a valid sha256 hex string', () => {
    const hash = computeServerHash('server-id', '1.0.0', 'https://endpoint.com', ['read']);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
