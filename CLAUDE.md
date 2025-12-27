# CLAUDE.md — Project Instructions

You are implementing a deterministic "Agent Resolver" CLI.

## Non-negotiable principles
1. Deterministic: Given the same inputs, output must be identical byte-for-byte (including ordering).
2. No LLM reasoning in core logic: Do not call any model APIs. This tool must work offline.
3. Auditable: Every accept/reject decision must include a machine-readable reason code + human-readable message.
4. Safe-by-default: If constraints cannot be satisfied, fail with actionable errors.
5. Minimal scope: Implement only what is defined in "SPEC.md". Do not add extra features.

## Inputs and Outputs
- Input: `agents.md` (treat as external ecosystem artifact; do not redefine it beyond minimal parsing required by SPEC.md).
- Output: `agents.lock` (generated, deterministic ordering, includes hashes) + optional `agents.resolution.json` (explain output).

## Tech constraints
- Language: TypeScript (Node.js 20+)
- Libraries:
  - frontmatter parsing: `gray-matter`
  - schema validation: `zod`
  - hashing: Node `crypto`
  - CLI: `commander`
- No database. Use filesystem only.

## Repository layout
- `packages/core` contains pure deterministic logic (no fs, no network).
- `packages/cli` contains filesystem and CLI wiring.
- `packages/schema` contains zod schemas and fixtures.
- `examples/hello-agent` contains a working example.

## Commands
Implement these commands exactly:
- `agent validate`
- `agent discover` (MVP: read from local `mcp.index.json` only; no network)
- `agent resolve`
- `agent resolve --explain` (writes `agents.resolution.json`)

## Output determinism rules
- Sort keys and arrays deterministically.
- Lockfile is stable: same content always yields same byte output.
- Use LF newlines.

## Quality bar
- Provide unit tests for core resolution.
- Provide an example and README Quickstart.
- Add CI workflow that runs tests and validates examples.
