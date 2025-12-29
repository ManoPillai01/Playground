# Agent Resolver

A deterministic CLI for resolving agent requirements against available MCP (Model Context Protocol) servers.

## Features

- **Deterministic**: Same inputs always produce identical byte-for-byte outputs
- **Auditable**: Every accept/reject decision includes machine-readable reason codes
- **Safe-by-default**: Fails with actionable errors when constraints cannot be satisfied
- **Offline**: No model calls or network requests required
- **Enterprise-ready**: GitOps registries, policy-as-code, and audit webhooks

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
  -i, --index <path...>       Path(s) to mcp.index.json file(s)
  -o, --output <path>         Path to output agents.lock (default: "./agents.lock")
  -e, --explain               Also write agents.resolution.json
  --explain-output <path>     Path to output resolution file
  --audit-webhook <url>       Send resolution to audit webhook
  --dry-run                   Show what would happen without writing files
```

### `agent sync`

Synchronize MCP server indexes from git registries.

```bash
agent sync [options]

Options:
  -r, --registry <name>  Sync specific registry only
  --force                Force re-clone even if cache exists
```

### `agent policy`

Policy management commands.

```bash
agent policy list              # List configured policies
agent policy check             # Check agent against policies
agent policy effective         # Show effective merged constraints
```

### `agent config`

Configuration management commands.

```bash
agent config init              # Create .agentrc.json
agent config show              # Show current configuration
agent config path              # Show config file path
```

### `agent brand`

Brand consistency checker - evaluates content against your brand profile.

```bash
agent brand init               # Create a brand profile
agent brand check              # Check content against brand profile
agent brand profile            # View brand profile details
agent brand audit              # View brand check audit log
agent brand serve              # Start the brand check API server
```

#### Quick Start

```bash
# Initialize a brand profile
agent brand init --name "My Brand"

# Check content via CLI
agent brand check --content "Your marketing copy here"

# Check content from file
agent brand check --file ./ad-copy.txt

# Start API server with web UI
agent brand serve --port 3000 --ui

# Open http://localhost:3000 in your browser

# Or check via API
curl -X POST http://localhost:3000/on-brand/check \
  -H "Content-Type: application/json" \
  -d '{"content": "Your content to check"}'
```

#### Web UI Integration

The brand checker includes a JavaScript SDK for easy integration:

```html
<script src="http://localhost:3000/on-brand-sdk.js"></script>
<script>
  // API client
  const client = new OnBrandClient('http://localhost:3000');
  const result = await client.check('Your content');

  // Or use the embeddable widget
  new OnBrandWidget('#container', { apiUrl: 'http://localhost:3000' });
</script>
```

See [UI Integration Guide](docs/UI-INTEGRATION.md) for full documentation.

#### Brand Check Response

The brand checker returns:
- **Status**: `On Brand ✅` | `Borderline ⚠️` | `Off Brand ❌`
- **Explanations**: 1-3 bullet points explaining why
- **Confidence Score**: 0-100 (optional)

#### Brand Profile Structure

```json
{
  "name": "My Brand",
  "version": "1.0.0",
  "values": ["Quality", "Innovation", "Trust"],
  "voiceDescriptors": ["professional", "friendly", "clear"],
  "toneAcceptable": ["helpful", "encouraging"],
  "toneUnacceptable": ["aggressive", "condescending"],
  "neverRules": ["competitor names", "profanity"],
  "examples": [
    { "content": "Good example...", "type": "good" },
    { "content": "Bad example...", "type": "bad" }
  ]
}
```

## Configuration

Create a `.agentrc.json` file to configure registries, policies, and defaults:

```json
{
  "registries": [
    {
      "name": "local",
      "type": "file",
      "path": "./mcp.index.json"
    },
    {
      "name": "company-servers",
      "type": "git",
      "url": "https://github.com/company/mcp-registry.git",
      "path": "servers/index.json",
      "branch": "main"
    }
  ],
  "policies": [
    "./org-policy.json"
  ],
  "cache": {
    "path": ".agent-cache",
    "ttl": 3600
  },
  "resolve": {
    "output": "./agents.lock",
    "explainOutput": "./agents.resolution.json",
    "alwaysExplain": false
  },
  "audit": {
    "webhook": "https://audit.company.com/agent-resolver"
  }
}
```

## Policy System

Define organizational policies to enforce constraints:

```json
{
  "id": "org-security-baseline",
  "name": "Organization Security Baseline",
  "version": "1.0.0",
  "priority": 100,
  "rules": [
    {
      "id": "require-signed-servers",
      "type": "require-signed",
      "value": true,
      "severity": "warning",
      "message": "Prefer signed MCP servers for production use"
    },
    {
      "id": "eu-data-residency",
      "type": "require-residency",
      "value": "eu-only",
      "severity": "error"
    }
  ]
}
```

**Rule Types:**
- `require-signed` - Require cryptographically signed servers
- `require-residency` - Enforce data residency (`us-only`, `eu-only`, `any`)
- `require-sensitivity` - Set minimum sensitivity level
- `forbid-server` - Block specific server IDs
- `allow-server` - Explicitly allow specific servers

## Project Structure

```
.
├── packages/
│   ├── schema/          # Zod schemas for validation
│   ├── core/            # Pure deterministic resolver logic
│   └── cli/             # Commander CLI with filesystem wiring
├── examples/
│   ├── hello-agent/     # Working example with policies
│   └── on-brand/        # Brand consistency checker example
├── docs/
│   ├── DOCUMENTATION.md # Comprehensive usage guide
│   ├── EXTENSION-SPEC.md
│   └── ALTERNATIVE-APPROACHES.md
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

```json
{
  "version": "1",
  "agent": {
    "name": "hello-agent",
    "version": "1.0.0"
  },
  "servers": [
    {
      "category": "filesystem",
      "serverId": "acme-fs",
      "version": "2.1.0",
      "endpoint": "stdio://acme-fs",
      "scopes": ["read", "write"],
      "hash": "sha256:..."
    }
  ],
  "generated": "2025-01-15T10:30:00.000Z"
}
```

### `agents.resolution.json` (with --explain)

Detailed resolution explanation including:
- Selected servers with selection reasons
- Rejected candidates with reason codes:
  - `MISSING_CATEGORY` - Server lacks required category
  - `MISSING_SCOPE` - Server doesn't support required permission
  - `RESIDENCY_MISMATCH` - Incompatible data residency
  - `SENSITIVITY_EXCEEDED` - Agent sensitivity too high for server
  - `UNSIGNED_NOT_ALLOWED` - Unsigned server rejected by policy

## Resolution Rules

### Candidate Selection

For each MCP requirement:
1. Server must have the required category
2. Server must support all required permission scopes

### Constraint Filtering

Servers are rejected if:
- Residency is incompatible (e.g., `us-only` agent rejects `eu-only` server)
- Agent sensitivity exceeds server's `maxSensitivity`
- Policy rules forbid the server

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

# Lint code
npm run lint
```

## Documentation

For comprehensive documentation, see:
- [Full Documentation](docs/DOCUMENTATION.md) - Complete usage guide
- [UI Integration Guide](docs/UI-INTEGRATION.md) - Brand checker UI patterns
- [Extension Spec](docs/EXTENSION-SPEC.md) - Enterprise extension architecture
- [Alternative Approaches](docs/ALTERNATIVE-APPROACHES.md) - Design decisions

## License

MIT
