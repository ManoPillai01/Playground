import { describe, it, expect } from 'vitest';
import {
  checkBrandConsistency,
  computeContentHash,
  generateAuditId,
  createBrandCheckResponse,
  createAuditEntry,
  validateBrandProfile,
  validateBrandCheckRequest,
  formatStatusDisplay,
} from '../brand-checker.js';
import { BrandProfile, BrandCheckRequest } from '@agent-resolver/schema';

// Test fixtures
const createTestProfile = (overrides: Partial<BrandProfile> = {}): BrandProfile => ({
  name: 'Test Brand',
  version: '1.0.0',
  values: ['Quality', 'Innovation', 'Trust'],
  voiceDescriptors: ['professional', 'friendly', 'clear'],
  toneAcceptable: ['helpful', 'encouraging'],
  toneUnacceptable: ['aggressive', 'condescending'],
  neverRules: ['competitor names', 'profanity'],
  examples: [
    { content: 'We help you succeed with innovative solutions.', type: 'good' },
    { content: 'Our competitors are terrible!', type: 'bad' },
  ],
  ...overrides,
});

const createTestRequest = (content: string, overrides: Partial<BrandCheckRequest> = {}): BrandCheckRequest => ({
  content,
  ...overrides,
});

describe('computeContentHash', () => {
  it('should produce consistent hash for same content', () => {
    const hash1 = computeContentHash('test content');
    const hash2 = computeContentHash('test content');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different content', () => {
    const hash1 = computeContentHash('content A');
    const hash2 = computeContentHash('content B');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce valid sha256 hex string', () => {
    const hash = computeContentHash('test content');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('generateAuditId', () => {
  it('should produce consistent ID for same inputs', () => {
    const id1 = generateAuditId('hash123', '2024-01-01T00:00:00.000Z');
    const id2 = generateAuditId('hash123', '2024-01-01T00:00:00.000Z');
    expect(id1).toBe(id2);
  });

  it('should produce different ID for different inputs', () => {
    const id1 = generateAuditId('hash123', '2024-01-01T00:00:00.000Z');
    const id2 = generateAuditId('hash456', '2024-01-01T00:00:00.000Z');
    expect(id1).not.toBe(id2);
  });

  it('should produce 16 character hex string', () => {
    const id = generateAuditId('hash123', '2024-01-01T00:00:00.000Z');
    expect(id).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe('formatStatusDisplay', () => {
  it('should format on-brand status', () => {
    expect(formatStatusDisplay('on-brand')).toBe('On Brand ✅');
  });

  it('should format borderline status', () => {
    expect(formatStatusDisplay('borderline')).toBe('Borderline ⚠️');
  });

  it('should format off-brand status', () => {
    expect(formatStatusDisplay('off-brand')).toBe('Off Brand ❌');
  });
});

describe('checkBrandConsistency', () => {
  describe('never rule detection', () => {
    it('should detect never rule violations', () => {
      const profile = createTestProfile({ neverRules: ['competitor names'] });
      const request = createTestRequest('Our competitor names are well known in the industry');

      const result = checkBrandConsistency(profile, request);

      expect(result.status).toBe('off-brand');
      expect(result.details.neverRuleViolations).toContain('competitor names');
      expect(result.explanations.some(e => e.aspect === 'never-rule')).toBe(true);
    });

    it('should pass when no never rules are violated', () => {
      const profile = createTestProfile({ neverRules: ['profanity'] });
      const request = createTestRequest('This is clean, professional content about our products.');

      const result = checkBrandConsistency(profile, request);

      expect(result.details.neverRuleViolations).toHaveLength(0);
    });
  });

  describe('tone boundary detection', () => {
    it('should detect unacceptable tone', () => {
      const profile = createTestProfile({ toneUnacceptable: ['aggressive'] });
      const request = createTestRequest('This aggressive approach will dominate the market!');

      const result = checkBrandConsistency(profile, request);

      expect(result.status).toBe('off-brand');
      expect(result.details.unacceptableToneFound).toContain('aggressive');
    });

    it('should recognize acceptable tone', () => {
      const profile = createTestProfile({ toneAcceptable: ['helpful'] });
      const request = createTestRequest('We are here to be helpful and support your journey.');

      const result = checkBrandConsistency(profile, request);

      expect(result.status).not.toBe('off-brand');
    });
  });

  describe('value alignment', () => {
    it('should score high when content mentions brand values', () => {
      const profile = createTestProfile({ values: ['Quality', 'Innovation'] });
      const request = createTestRequest('Our focus on quality and innovation sets us apart.');

      const result = checkBrandConsistency(profile, request);

      expect(result.details.valueAlignmentScore).toBeGreaterThan(0.5);
    });

    it('should score low when content lacks brand values', () => {
      const profile = createTestProfile({ values: ['Quality', 'Innovation', 'Trust'] });
      const request = createTestRequest('Buy our product today.');

      const result = checkBrandConsistency(profile, request);

      expect(result.details.valueAlignmentScore).toBeLessThan(0.5);
    });
  });

  describe('voice alignment', () => {
    it('should score high when content matches voice descriptors', () => {
      const profile = createTestProfile({ voiceDescriptors: ['professional', 'clear'] });
      const request = createTestRequest('Our professional team provides clear guidance.');

      const result = checkBrandConsistency(profile, request);

      expect(result.details.voiceAlignmentScore).toBeGreaterThan(0.5);
    });
  });

  describe('example similarity', () => {
    it('should detect similarity to bad examples', () => {
      const profile = createTestProfile({
        examples: [
          { content: 'Our competitors are terrible and outdated!', type: 'bad' },
        ],
      });
      const request = createTestRequest('Our competitors are terrible and outdated!');

      const result = checkBrandConsistency(profile, request);

      expect(result.details.exampleSimilarity.bad).toBeGreaterThan(0.3);
    });

    it('should detect similarity to good examples', () => {
      const profile = createTestProfile({
        examples: [
          { content: 'We help you succeed with innovative solutions.', type: 'good' },
        ],
      });
      const request = createTestRequest('We help you succeed with innovative solutions.');

      const result = checkBrandConsistency(profile, request);

      expect(result.details.exampleSimilarity.good).toBeGreaterThan(0.3);
    });
  });

  describe('status determination', () => {
    it('should return on-brand for good content', () => {
      const profile = createTestProfile();
      const request = createTestRequest(
        'We focus on quality and innovation to help our customers succeed. Our professional team is here to provide clear and helpful guidance.'
      );

      const result = checkBrandConsistency(profile, request);

      expect(result.status).toBe('on-brand');
    });

    it('should return off-brand for content with violations', () => {
      const profile = createTestProfile({ neverRules: ['profanity'] });
      const request = createTestRequest('This product is amazing, no profanity here but oops profanity slipped in!');

      const result = checkBrandConsistency(profile, request);

      expect(result.status).toBe('off-brand');
    });

    it('should return borderline for neutral content', () => {
      const profile = createTestProfile({
        values: ['Specific', 'Unique', 'Rare', 'Uncommon', 'Exceptional'],
        voiceDescriptors: ['distinctive', 'particular'],
      });
      const request = createTestRequest('We offer products and services.');

      const result = checkBrandConsistency(profile, request);

      expect(result.status).toBe('borderline');
    });
  });

  describe('determinism', () => {
    it('should produce identical results for same inputs', () => {
      const profile = createTestProfile();
      const request = createTestRequest('Test content for determinism check');

      const result1 = checkBrandConsistency(profile, request);
      const result2 = checkBrandConsistency(profile, request);

      expect(result1.status).toBe(result2.status);
      expect(result1.confidence).toBe(result2.confidence);
      expect(result1.explanations).toEqual(result2.explanations);
    });
  });

  describe('explanations', () => {
    it('should provide 1-3 explanations', () => {
      const profile = createTestProfile();
      const request = createTestRequest('Test content');

      const result = checkBrandConsistency(profile, request);

      expect(result.explanations.length).toBeGreaterThanOrEqual(1);
      expect(result.explanations.length).toBeLessThanOrEqual(3);
    });

    it('should sort explanations by severity', () => {
      const profile = createTestProfile({ neverRules: ['profanity'], toneUnacceptable: ['aggressive'] });
      const request = createTestRequest('This aggressive profanity is unacceptable!');

      const result = checkBrandConsistency(profile, request);

      const severityOrder = { critical: 0, warning: 1, info: 2 };
      for (let i = 1; i < result.explanations.length; i++) {
        const prevSeverity = severityOrder[result.explanations[i - 1].severity];
        const currSeverity = severityOrder[result.explanations[i].severity];
        expect(prevSeverity).toBeLessThanOrEqual(currSeverity);
      }
    });
  });

  describe('confidence score', () => {
    it('should return high confidence for clear violations', () => {
      const profile = createTestProfile({ neverRules: ['profanity'] });
      const request = createTestRequest('This contains profanity which is bad');

      const result = checkBrandConsistency(profile, request);

      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return confidence between 0 and 100', () => {
      const profile = createTestProfile();
      const request = createTestRequest('Some random content here');

      const result = checkBrandConsistency(profile, request);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });
});

describe('createBrandCheckResponse', () => {
  it('should create a complete response', () => {
    const profile = createTestProfile();
    const request = createTestRequest('Test content');
    const timestamp = '2024-01-01T00:00:00.000Z';

    const response = createBrandCheckResponse(profile, request, timestamp);

    expect(response.status).toBeDefined();
    expect(response.statusDisplay).toBeDefined();
    expect(response.explanations.length).toBeGreaterThanOrEqual(1);
    expect(response.profileVersion).toBe('1.0.0');
    expect(response.checkedAt).toBe(timestamp);
    expect(response.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should use current timestamp if not provided', () => {
    const profile = createTestProfile();
    const request = createTestRequest('Test content');

    const before = new Date().toISOString();
    const response = createBrandCheckResponse(profile, request);
    const after = new Date().toISOString();

    expect(response.checkedAt >= before).toBe(true);
    expect(response.checkedAt <= after).toBe(true);
  });
});

describe('createAuditEntry', () => {
  it('should create a valid audit entry', () => {
    const profile = createTestProfile();
    const request = createTestRequest('Test content');
    const response = createBrandCheckResponse(profile, request, '2024-01-01T00:00:00.000Z');

    const entry = createAuditEntry(profile, response);

    expect(entry.id).toMatch(/^[a-f0-9]{16}$/);
    expect(entry.timestamp).toBe(response.checkedAt);
    expect(entry.profileName).toBe(profile.name);
    expect(entry.profileVersion).toBe(profile.version);
    expect(entry.contentHash).toBe(response.contentHash);
    expect(entry.status).toBe(response.status);
    expect(entry.confidence).toBe(response.confidence);
  });
});

describe('validateBrandProfile', () => {
  it('should validate a correct profile', () => {
    const profile = {
      name: 'Test',
      version: '1.0.0',
      values: ['Value1'],
      voiceDescriptors: ['Descriptor1'],
    };

    const result = validateBrandProfile(profile);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test');
    }
  });

  it('should reject invalid version format', () => {
    const profile = {
      name: 'Test',
      version: 'invalid',
      values: ['Value1'],
      voiceDescriptors: ['Descriptor1'],
    };

    const result = validateBrandProfile(profile);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    }
  });

  it('should reject empty values array', () => {
    const profile = {
      name: 'Test',
      version: '1.0.0',
      values: [],
      voiceDescriptors: ['Descriptor1'],
    };

    const result = validateBrandProfile(profile);

    expect(result.success).toBe(false);
  });

  it('should reject empty voice descriptors array', () => {
    const profile = {
      name: 'Test',
      version: '1.0.0',
      values: ['Value1'],
      voiceDescriptors: [],
    };

    const result = validateBrandProfile(profile);

    expect(result.success).toBe(false);
  });
});

describe('validateBrandCheckRequest', () => {
  it('should validate a correct request', () => {
    const request = {
      content: 'Test content',
    };

    const result = validateBrandCheckRequest(request);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Test content');
    }
  });

  it('should validate request with content type', () => {
    const request = {
      content: 'Test content',
      contentType: 'ad-copy' as const,
    };

    const result = validateBrandCheckRequest(request);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentType).toBe('ad-copy');
    }
  });

  it('should reject empty content', () => {
    const request = {
      content: '',
    };

    const result = validateBrandCheckRequest(request);

    expect(result.success).toBe(false);
  });

  it('should reject invalid content type', () => {
    const request = {
      content: 'Test',
      contentType: 'invalid-type',
    };

    const result = validateBrandCheckRequest(request);

    expect(result.success).toBe(false);
  });
});
