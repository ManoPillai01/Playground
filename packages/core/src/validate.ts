import { ZodError } from 'zod';
import {
  AgentsFrontmatter,
  McpIndex,
  type AgentsFrontmatter as AgentsFrontmatterType,
  type McpIndex as McpIndexType,
} from '@agent-resolver/schema';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate agents.md frontmatter data
 */
export function validateAgentsFrontmatter(
  data: unknown
): ValidationResult<AgentsFrontmatterType> {
  try {
    const parsed = AgentsFrontmatter.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((e) => {
        const path = e.path.join('.');
        return path ? `${path}: ${e.message}` : e.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate MCP index file data
 */
export function validateMcpIndex(data: unknown): ValidationResult<McpIndexType> {
  try {
    const parsed = McpIndex.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((e) => {
        const path = e.path.join('.');
        return path ? `${path}: ${e.message}` : e.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}
