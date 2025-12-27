import { readFileSync, writeFileSync, existsSync } from 'fs';
import matter from 'gray-matter';

/**
 * Read and parse agents.md file, extracting frontmatter
 */
export function readAgentsMd(path: string): { data: unknown; content: string } {
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  const content = readFileSync(path, 'utf-8');
  const parsed = matter(content);
  return {
    data: parsed.data,
    content: parsed.content,
  };
}

/**
 * Read and parse mcp.index.json file
 */
export function readMcpIndex(path: string): unknown {
  if (!existsSync(path)) {
    throw new Error(`MCP index file not found: ${path}`);
  }
  const content = readFileSync(path, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in MCP index file: ${path}`);
  }
}

/**
 * Write content to a file with LF newlines
 */
export function writeFile(path: string, content: string): void {
  // Ensure LF newlines
  const normalized = content.replace(/\r\n/g, '\n');
  writeFileSync(path, normalized, 'utf-8');
}

/**
 * Check if a file exists
 */
export function fileExists(path: string): boolean {
  return existsSync(path);
}
