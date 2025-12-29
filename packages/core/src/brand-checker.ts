import { createHash } from 'crypto';
import {
  BrandProfile,
  BrandCheckRequest,
  BrandCheckResponse,
  BrandAlignmentStatus,
  BrandExplanation,
  BrandCheckAuditEntry,
} from '@agent-resolver/schema';

/**
 * Compute deterministic hash for content
 */
export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a unique audit ID
 */
export function generateAuditId(contentHash: string, timestamp: string): string {
  return createHash('sha256')
    .update(`${contentHash}|${timestamp}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Normalize text for comparison (lowercase, trim, collapse whitespace)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[\s.,!?;:'"()\[\]{}]+/)
    .filter((word) => word.length > 0);
}

/**
 * Check if content contains a phrase (case-insensitive)
 */
function containsPhrase(content: string, phrase: string): boolean {
  const normalizedContent = normalizeText(content);
  const normalizedPhrase = normalizeText(phrase);
  return normalizedContent.includes(normalizedPhrase);
}

/**
 * Calculate word overlap score between two texts
 */
function calculateWordOverlap(text1: string, text2: string): number {
  const words1 = new Set(tokenize(text1));
  const words2 = new Set(tokenize(text2));

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      overlap++;
    }
  }

  // Jaccard similarity
  const union = new Set([...words1, ...words2]).size;
  return overlap / union;
}

/**
 * Check content against "never" rules
 */
function checkNeverRules(
  content: string,
  neverRules: readonly string[]
): { violated: string[]; passed: string[] } {
  const violated: string[] = [];
  const passed: string[] = [];

  for (const rule of neverRules) {
    if (containsPhrase(content, rule)) {
      violated.push(rule);
    } else {
      passed.push(rule);
    }
  }

  // Sort for determinism
  violated.sort();
  passed.sort();

  return { violated, passed };
}

/**
 * Check content against voice descriptors
 */
function checkVoiceAlignment(
  content: string,
  voiceDescriptors: readonly string[]
): { aligned: string[]; missing: string[] } {
  const aligned: string[] = [];
  const missing: string[] = [];

  for (const descriptor of voiceDescriptors) {
    // Simple keyword check - in production this would use embeddings
    if (containsPhrase(content, descriptor)) {
      aligned.push(descriptor);
    } else {
      missing.push(descriptor);
    }
  }

  // Sort for determinism
  aligned.sort();
  missing.sort();

  return { aligned, missing };
}

/**
 * Check content against tone boundaries
 */
function checkToneBoundaries(
  content: string,
  acceptable: readonly string[],
  unacceptable: readonly string[]
): { acceptableFound: string[]; unacceptableFound: string[] } {
  const acceptableFound: string[] = [];
  const unacceptableFound: string[] = [];

  for (const tone of acceptable) {
    if (containsPhrase(content, tone)) {
      acceptableFound.push(tone);
    }
  }

  for (const tone of unacceptable) {
    if (containsPhrase(content, tone)) {
      unacceptableFound.push(tone);
    }
  }

  // Sort for determinism
  acceptableFound.sort();
  unacceptableFound.sort();

  return { acceptableFound, unacceptableFound };
}

/**
 * Check content against brand values
 */
function checkValueAlignment(
  content: string,
  values: readonly string[]
): { aligned: string[]; missing: string[] } {
  const aligned: string[] = [];
  const missing: string[] = [];

  for (const value of values) {
    if (containsPhrase(content, value)) {
      aligned.push(value);
    } else {
      missing.push(value);
    }
  }

  // Sort for determinism
  aligned.sort();
  missing.sort();

  return { aligned, missing };
}

/**
 * Calculate similarity with canonical examples
 */
function checkExampleSimilarity(
  content: string,
  examples: BrandProfile['examples']
): { goodSimilarity: number; badSimilarity: number; bestMatch: string | null } {
  const goodExamples = examples.filter((e) => e.type === 'good');
  const badExamples = examples.filter((e) => e.type === 'bad');

  let goodSimilarity = 0;
  let badSimilarity = 0;
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const example of goodExamples) {
    const score = calculateWordOverlap(content, example.content);
    if (score > goodSimilarity) {
      goodSimilarity = score;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = example.content.substring(0, 50) + (example.content.length > 50 ? '...' : '');
    }
  }

  for (const example of badExamples) {
    const score = calculateWordOverlap(content, example.content);
    if (score > badSimilarity) {
      badSimilarity = score;
    }
  }

  return { goodSimilarity, badSimilarity, bestMatch };
}

/**
 * Brand check result with internal scoring
 */
interface BrandCheckResult {
  status: BrandAlignmentStatus;
  explanations: BrandExplanation[];
  confidence: number;
  details: {
    neverRuleViolations: string[];
    unacceptableToneFound: string[];
    valueAlignmentScore: number;
    voiceAlignmentScore: number;
    exampleSimilarity: { good: number; bad: number };
  };
}

/**
 * Core brand consistency check - deterministic logic
 *
 * This function evaluates content against a brand profile and returns
 * a structured result with status, explanations, and confidence score.
 *
 * The algorithm:
 * 1. Check for "never rule" violations (critical)
 * 2. Check for unacceptable tone usage (critical)
 * 3. Check similarity with bad examples (warning)
 * 4. Check value alignment (scoring)
 * 5. Check voice alignment (scoring)
 * 6. Check similarity with good examples (scoring)
 *
 * Status determination:
 * - OFF-BRAND: Any critical violation (never rules, unacceptable tone, high bad example similarity)
 * - BORDERLINE: Low scores or warnings without critical violations
 * - ON-BRAND: Good alignment without violations
 */
export function checkBrandConsistency(
  profile: BrandProfile,
  request: BrandCheckRequest
): BrandCheckResult {
  const content = request.content;
  const explanations: BrandExplanation[] = [];

  // 1. Check never rules (critical)
  const neverCheck = checkNeverRules(content, profile.neverRules);

  // 2. Check tone boundaries
  const toneCheck = checkToneBoundaries(
    content,
    profile.toneAcceptable,
    profile.toneUnacceptable
  );

  // 3. Check example similarity
  const exampleCheck = checkExampleSimilarity(content, profile.examples);

  // 4. Check value alignment
  const valueCheck = checkValueAlignment(content, profile.values);
  const valueScore = profile.values.length > 0
    ? valueCheck.aligned.length / profile.values.length
    : 1;

  // 5. Check voice alignment
  const voiceCheck = checkVoiceAlignment(content, profile.voiceDescriptors);
  const voiceScore = profile.voiceDescriptors.length > 0
    ? voiceCheck.aligned.length / profile.voiceDescriptors.length
    : 1;

  // Determine status and build explanations
  let status: BrandAlignmentStatus = 'on-brand';
  let confidence = 85; // Base confidence

  // Critical: Never rule violations
  if (neverCheck.violated.length > 0) {
    status = 'off-brand';
    confidence = 95;
    explanations.push({
      text: `Contains prohibited content: "${neverCheck.violated[0]}"`,
      aspect: 'never-rule',
      severity: 'critical',
    });
  }

  // Critical: Unacceptable tone
  if (toneCheck.unacceptableFound.length > 0) {
    status = 'off-brand';
    confidence = Math.max(confidence, 90);
    if (explanations.length < 3) {
      explanations.push({
        text: `Uses unacceptable tone: "${toneCheck.unacceptableFound[0]}"`,
        aspect: 'tone',
        severity: 'critical',
      });
    }
  }

  // Warning: High similarity to bad examples
  if (exampleCheck.badSimilarity > 0.3) {
    if (status !== 'off-brand') {
      status = exampleCheck.badSimilarity > 0.5 ? 'off-brand' : 'borderline';
    }
    confidence = Math.max(confidence, 80);
    if (explanations.length < 3) {
      explanations.push({
        text: `Content resembles known off-brand examples`,
        aspect: 'example-match',
        severity: exampleCheck.badSimilarity > 0.5 ? 'critical' : 'warning',
      });
    }
  }

  // Scoring: Check alignment levels
  if (status === 'on-brand') {
    const combinedScore = (valueScore + voiceScore) / 2;

    if (combinedScore < 0.3) {
      status = 'borderline';
      confidence = 70;
    } else if (combinedScore < 0.5) {
      status = 'borderline';
      confidence = 75;
    } else {
      confidence = 80 + Math.round(combinedScore * 15);
    }
  }

  // Add positive or constructive explanations
  if (explanations.length === 0) {
    if (exampleCheck.goodSimilarity > 0.3) {
      explanations.push({
        text: `Content aligns well with established brand examples`,
        aspect: 'example-match',
        severity: 'info',
      });
    } else if (valueScore > 0.5) {
      explanations.push({
        text: `Content reflects brand values: ${valueCheck.aligned.slice(0, 2).join(', ')}`,
        aspect: 'value',
        severity: 'info',
      });
    } else {
      explanations.push({
        text: `Content is acceptable but could better reflect brand values`,
        aspect: 'value',
        severity: 'info',
      });
    }
  }

  // Add voice alignment explanation if space
  if (explanations.length < 3 && voiceScore < 0.5 && status !== 'off-brand') {
    const missingVoice = voiceCheck.missing.slice(0, 2).join(', ');
    if (missingVoice) {
      explanations.push({
        text: `Voice could better emphasize: ${missingVoice}`,
        aspect: 'voice',
        severity: 'info',
      });
    }
  }

  // Add acceptable tone explanation if space
  if (explanations.length < 3 && toneCheck.acceptableFound.length > 0) {
    explanations.push({
      text: `Good use of brand tone: ${toneCheck.acceptableFound.slice(0, 2).join(', ')}`,
      aspect: 'tone',
      severity: 'info',
    });
  }

  // Ensure we have at least one explanation
  if (explanations.length === 0) {
    explanations.push({
      text: status === 'on-brand'
        ? 'Content aligns with brand guidelines'
        : 'Content requires review for brand alignment',
      severity: 'info',
    });
  }

  // Sort explanations by severity for determinism
  explanations.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Limit to 3 explanations
  const finalExplanations = explanations.slice(0, 3);

  return {
    status,
    explanations: finalExplanations,
    confidence,
    details: {
      neverRuleViolations: neverCheck.violated,
      unacceptableToneFound: toneCheck.unacceptableFound,
      valueAlignmentScore: valueScore,
      voiceAlignmentScore: voiceScore,
      exampleSimilarity: {
        good: exampleCheck.goodSimilarity,
        bad: exampleCheck.badSimilarity,
      },
    },
  };
}

/**
 * Format status with emoji for display
 */
export function formatStatusDisplay(status: BrandAlignmentStatus): string {
  switch (status) {
    case 'on-brand':
      return 'On Brand ✅';
    case 'borderline':
      return 'Borderline ⚠️';
    case 'off-brand':
      return 'Off Brand ❌';
  }
}

/**
 * Create a full brand check response
 */
export function createBrandCheckResponse(
  profile: BrandProfile,
  request: BrandCheckRequest,
  timestamp?: string
): BrandCheckResponse {
  const result = checkBrandConsistency(profile, request);
  const checkedAt = timestamp ?? new Date().toISOString();
  const contentHash = computeContentHash(request.content);

  return {
    status: result.status,
    statusDisplay: formatStatusDisplay(result.status),
    explanations: result.explanations,
    confidence: result.confidence,
    profileVersion: profile.version,
    checkedAt,
    contentHash,
  };
}

/**
 * Create an audit log entry from a brand check response
 */
export function createAuditEntry(
  profile: BrandProfile,
  response: BrandCheckResponse
): BrandCheckAuditEntry {
  return {
    id: generateAuditId(response.contentHash, response.checkedAt),
    timestamp: response.checkedAt,
    profileName: profile.name,
    profileVersion: response.profileVersion,
    contentHash: response.contentHash,
    status: response.status,
    confidence: response.confidence,
  };
}

/**
 * Validate a brand profile
 */
export function validateBrandProfile(
  data: unknown
): { success: true; data: BrandProfile } | { success: false; errors: string[] } {
  const result = BrandProfile.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    ),
  };
}

/**
 * Validate a brand check request
 */
export function validateBrandCheckRequest(
  data: unknown
): { success: true; data: BrandCheckRequest } | { success: false; errors: string[] } {
  const result = BrandCheckRequest.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    ),
  };
}
