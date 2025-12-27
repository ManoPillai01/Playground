# Agent Resolver

A deterministic CLI for resolving agent requirements against available MCP servers.

## Features

- **Deterministic**: Same inputs always produce identical byte-for-byte outputs
- **Auditable**: Every accept/reject decision includes machine-readable reason codes
- **Safe-by-default**: Fails with actionable errors when constraints cannot be satisfied
- **Offline**: No model calls or network requests required

## Quickstart

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run the CLI
npm run agent -- --help
```

## Try the Example

```bash
cd examples/hello-agent

# Validate configuration files
npx agent validate

# Discover available MCP servers
npx agent discover

# Resolve requirements and generate lockfile
npx agent resolve

# Generate lockfile with explanation
npx agent resolve --explain
```

## Commands

### `agent validate`

Validates `agents.md` frontmatter schema and `mcp.index.json` if present.

```bash
agent validate [options]

Options:
  -a, --agents <path>  Path to agents.md file (default: "./agents.md")
  -i, --index <path>   Path to mcp.index.json file (default: "./mcp.index.json")
```

### `agent discover`

Prints available MCP servers grouped by category from local index.

```bash
agent discover [options]

Options:
  -i, --index <path>   Path to mcp.index.json file (default: "./mcp.index.json")
```

### `agent resolve`

Resolves agent requirements and generates `agents.lock`.

```bash
agent resolve [options]

Options:
  -a, --agents <path>         Path to agents.md file (default: "./agents.md")
  -i, --index <path>          Path to mcp.index.json file (default: "./mcp.index.json")
  -o, --output <path>         Path to output agents.lock (default: "./agents.lock")
  -e, --explain               Also write agents.resolution.json
  --explain-output <path>     Path to output resolution file (default: "./agents.resolution.json")
```

## Project Structure

```
.
├── packages/
│   ├── schema/          # Zod schemas for validation
│   ├── core/            # Pure deterministic resolver logic
│   └── cli/             # Commander CLI with filesystem wiring
├── examples/
│   └── hello-agent/     # Working example
└── .github/
    └── workflows/       # CI configuration
```

## Output Files

### `agents.lock`

A JSON lockfile containing:
- Agent name and version
- Selected MCP servers per requirement
- Endpoints and scopes
- SHA-256 hashes for integrity verification

### `agents.resolution.json` (with --explain)

Detailed resolution explanation including:
- Selected servers with selection reasons
- Rejected candidates with reason codes:
  - `MISSING_CATEGORY`
  - `MISSING_SCOPE`
  - `RESIDENCY_MISMATCH`
  - `SENSITIVITY_EXCEEDED`
  - `UNSIGNED_NOT_ALLOWED`

## Resolution Rules

### Candidate Selection

For each MCP requirement:
1. Server must have the required category
2. Server must support all required permission scopes

### Constraint Filtering

Servers are rejected if:
- Residency is incompatible (e.g., `us-only` agent rejects `eu-only` server)
- Agent sensitivity exceeds server's `maxSensitivity`

### Deterministic Tie-Breaking

When multiple candidates remain:
1. Prefer signed servers (`trust.signed=true`)
2. Lexicographically smallest `id`
3. Lexicographically smallest `version`

## Development

```bash
# Run tests
npm test

# Build all packages
npm run build

# Clean build artifacts
npm run clean
```

## License

MIT
