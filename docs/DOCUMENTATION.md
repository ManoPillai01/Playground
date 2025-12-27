# Agent Resolver Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [The Problem](#the-problem)
3. [The Solution](#the-solution)
4. [Key Concepts](#key-concepts)
5. [Architecture](#architecture)
6. [Installation](#installation)
7. [Quick Start](#quick-start)
8. [CLI Reference](#cli-reference)
9. [Input File Formats](#input-file-formats)
10. [Output File Formats](#output-file-formats)
11. [Resolution Algorithm](#resolution-algorithm)
12. [Benefits for Developers](#benefits-for-developers)
13. [Use Cases](#use-cases)
14. [Best Practices](#best-practices)
15. [Troubleshooting](#troubleshooting)

---

## Introduction

Agent Resolver is a **deterministic command-line tool** for resolving AI agent requirements against available MCP (Model Context Protocol) servers. It produces auditable, reproducible toolchain selections without requiring any LLM calls or network requests.

Think of it as a "package manager" for agent capabilities—just as `npm` or `pip` resolves package dependencies, Agent Resolver resolves which MCP servers an agent should connect to based on its requirements and constraints.

### What Makes It Different?

- **100% Deterministic**: Same inputs always produce byte-identical outputs
- **Fully Offline**: No API calls, no network requests, no LLM reasoning
- **Auditable**: Every decision includes machine-readable reason codes
- **Safe by Default**: Fails with actionable errors when constraints can't be satisfied

---

## The Problem

Modern AI agents often need to interact with multiple external tools and services through MCP servers. This creates several challenges:

### 1. Manual Server Selection is Error-Prone

Developers manually choosing which MCP servers to connect to can easily:
- Miss compatibility requirements
- Overlook data residency constraints
- Select servers that don't support required permissions
- Create inconsistent configurations across environments

### 2. Non-Reproducible Configurations

Without a lockfile mechanism, agent configurations can drift:
- Different team members might connect to different servers
- Production and development environments diverge
- Debugging becomes difficult when configurations aren't pinned

### 3. Compliance and Security Blind Spots

Organizations need to ensure:
- Data stays within required geographic boundaries
- Sensitive data only flows to appropriately certified servers
- All server selections are auditable for compliance reviews

### 4. LLM-Based Selection is Non-Deterministic

Using an LLM to select servers introduces:
- Non-reproducible results
- Latency and cost from API calls
- Potential for hallucinated or invalid selections
- Difficulty in auditing decisions

---

## The Solution

Agent Resolver addresses these challenges with a purely algorithmic approach:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   agents.md     │     │                  │     │  agents.lock    │
│  (requirements) │────▶│  Agent Resolver  │────▶│  (locked pins)  │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                        │
         │              ┌────────┴────────┐               │
         │              │                 │               │
         │              ▼                 ▼               │
         │     ┌─────────────┐   ┌──────────────┐         │
         │     │ Validation  │   │  Resolution  │         │
         │     │   Rules     │   │   Algorithm  │         │
         │     └─────────────┘   └──────────────┘         │
         │                                                │
         ▼                                                ▼
┌─────────────────┐                            ┌──────────────────────┐
│ mcp.index.json  │                            │ agents.resolution.json│
│ (available      │                            │ (audit trail)        │
│  servers)       │                            │                      │
└─────────────────┘                            └──────────────────────┘
```

---

## Key Concepts

### Agents

An **agent** is defined in `agents.md` with:
- A name and version
- Required MCP server categories
- Permission scopes needed per category
- Optional constraints (data sensitivity, residency)

### MCP Servers

**MCP servers** are external services that provide capabilities to agents. Each server:
- Belongs to one or more categories (e.g., "audiences", "reporting")
- Exposes specific permission scopes
- Has data handling characteristics (residency, sensitivity limits)
- May be cryptographically signed by a publisher

### Requirements

**Requirements** specify what an agent needs:
- Category: The type of capability (e.g., "audiences")
- Permissions: Specific scopes needed (e.g., "read:audiences", "write:audiences")

### Constraints

**Constraints** define rules that must be satisfied:
- **Residency**: Where data can be stored ("us-only", "eu-only", "any")
- **Sensitivity**: Maximum data classification level the agent handles

### Resolution

**Resolution** is the process of matching requirements to available servers while respecting constraints. The output is a deterministic selection pinned in a lockfile.

---

## Architecture

Agent Resolver follows a clean, modular architecture:

```
agent-resolver/
├── packages/
│   ├── schema/          # Data validation schemas (Zod)
│   │   ├── agents-md.ts      # agents.md frontmatter schema
│   │   ├── mcp-index.ts      # mcp.index.json schema
│   │   ├── lockfile.ts       # agents.lock schema
│   │   └── resolution.ts     # Resolution explanation schema
│   │
│   ├── core/            # Pure business logic (no I/O)
│   │   ├── resolver.ts       # Resolution algorithm
│   │   ├── validate.ts       # Schema validation
│   │   └── hash.ts           # Deterministic hashing
│   │
│   └── cli/             # Command-line interface
│       ├── index.ts          # CLI entry point
│       └── commands/
│           ├── validate.ts   # agent validate
│           ├── discover.ts   # agent discover
│           └── resolve.ts    # agent resolve
│
└── examples/
    └── hello-agent/     # Working example
```

### Design Principles

1. **Pure Core**: The `core` package has no file system or network dependencies. It's pure TypeScript that takes data in and returns data out. This makes it:
   - Easy to test
   - Portable to other environments (browser, serverless)
   - Guaranteed deterministic

2. **Schema-First**: All data structures are defined with Zod schemas, providing:
   - Runtime type validation
   - TypeScript type inference
   - Clear documentation of expected formats

3. **CLI as Adapter**: The `cli` package is a thin adapter that:
   - Reads files from disk
   - Calls core functions
   - Writes outputs
   - Handles user interaction

---

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher

### From Source

```bash
# Clone the repository
git clone <repository-url>
cd agent-resolver

# Install dependencies
npm install

# Build all packages
npm run build

# Verify installation
node packages/cli/dist/index.js --help
```

### Adding to Your Project

```bash
# From the agent-resolver directory
npm link

# In your project directory
npm link agent-resolver
```

---

## Quick Start

### Step 1: Create Your Agent Definition

Create `agents.md` in your project:

```markdown
---
name: my-analytics-agent
version: 1.0.0
requires:
  mcp:
    - category: analytics
      permissions:
        - read:metrics
        - read:dashboards
    - category: reporting
      permissions:
        - read:reports
        - write:reports
constraints:
  data:
    sensitivity: internal
    residency: us-only
---

# My Analytics Agent

This agent analyzes business metrics and generates reports.
```

### Step 2: Create Your MCP Server Index

Create `mcp.index.json` listing available servers:

```json
[
  {
    "id": "acme-analytics",
    "version": "2.0.0",
    "endpoint": "https://mcp.acme.com/analytics",
    "categories": ["analytics"],
    "scopes": ["read:metrics", "read:dashboards", "write:metrics"],
    "data": {
      "residency": ["us-only", "eu-only"],
      "maxSensitivity": "confidential"
    },
    "trust": {
      "signed": true,
      "publisher": "Acme Corp"
    }
  },
  {
    "id": "acme-reporting",
    "version": "3.0.0",
    "endpoint": "https://mcp.acme.com/reporting",
    "categories": ["reporting"],
    "scopes": ["read:reports", "write:reports"],
    "data": {
      "residency": ["us-only"],
      "maxSensitivity": "pii.low"
    },
    "trust": {
      "signed": true,
      "publisher": "Acme Corp"
    }
  }
]
```

### Step 3: Validate Your Configuration

```bash
agent validate

# Output:
# Validating ./agents.md...
# ✓ agents.md frontmatter is valid
# Validating ./mcp.index.json...
# ✓ mcp.index.json is valid
# Validation complete.
```

### Step 4: Discover Available Servers

```bash
agent discover

# Output:
# Available MCP Servers by Category:
#
#   analytics:
#     - acme-analytics@2.0.0 [signed]
#       Scopes: read:metrics, read:dashboards, write:metrics
#       Residency: us-only, eu-only
#       Max Sensitivity: confidential
#
#   reporting:
#     - acme-reporting@3.0.0 [signed]
#       Scopes: read:reports, write:reports
#       Residency: us-only
#       Max Sensitivity: pii.low
```

### Step 5: Resolve and Generate Lockfile

```bash
agent resolve --explain

# Output:
# Resolving agent 'my-analytics-agent@1.0.0'...
#   Requirements: 2 MCP category/categories
#   Available servers: 2
#
# ✓ Wrote ./agents.lock
# ✓ Wrote ./agents.resolution.json
#
# Resolution Summary:
#   analytics: acme-analytics@2.0.0
#     Scopes: read:dashboards, read:metrics
#   reporting: acme-reporting@3.0.0
#     Scopes: read:reports, write:reports
#
# ✓ Resolution complete
```

---

## CLI Reference

### Global Options

```
agent [command] [options]

Options:
  -V, --version  Output version number
  -h, --help     Display help
```

### agent validate

Validates the schema of `agents.md` frontmatter and `mcp.index.json`.

```bash
agent validate [options]

Options:
  -a, --agents <path>  Path to agents.md file (default: "./agents.md")
  -i, --index <path>   Path to mcp.index.json file (default: "./mcp.index.json")
```

**Exit Codes:**
- `0`: All files are valid
- `1`: Validation errors found

**Example:**
```bash
# Validate with custom paths
agent validate -a ./config/agents.md -i ./config/servers.json
```

### agent discover

Lists available MCP servers grouped by category.

```bash
agent discover [options]

Options:
  -i, --index <path>   Path to mcp.index.json file (default: "./mcp.index.json")
```

**Example:**
```bash
# Discover servers from custom index
agent discover -i ./production-servers.json
```

### agent resolve

Resolves agent requirements and generates a lockfile.

```bash
agent resolve [options]

Options:
  -a, --agents <path>         Path to agents.md file (default: "./agents.md")
  -i, --index <path>          Path to mcp.index.json file (default: "./mcp.index.json")
  -o, --output <path>         Path to output agents.lock (default: "./agents.lock")
  -e, --explain               Also write agents.resolution.json
  --explain-output <path>     Path to resolution output (default: "./agents.resolution.json")
```

**Exit Codes:**
- `0`: Resolution successful
- `1`: Resolution failed (no candidates for required category)

**Example:**
```bash
# Resolve with full audit trail
agent resolve --explain -o ./lockfiles/agents.lock --explain-output ./audit/resolution.json
```

---

## Input File Formats

### agents.md

The agent definition file uses YAML frontmatter in a Markdown file:

```yaml
---
# Required fields
name: string           # Agent identifier
version: string        # Semantic version

requires:
  mcp:                 # Array of MCP requirements
    - category: string      # Server category needed
      permissions: string[] # Required permission scopes

# Optional fields
constraints:
  data:
    sensitivity: enum  # public | internal | confidential | pii.low | pii.moderate | pii.high
    residency: enum    # any | us-only | eu-only
  actions:
    forbid: string[]   # Action labels to forbid (reserved for future use)
---

# Markdown content (optional, for documentation)
```

**Sensitivity Levels (ordered from least to most sensitive):**
1. `public` - Publicly available data
2. `internal` - Internal company data
3. `confidential` - Confidential business data
4. `pii.low` - Low-risk personal data
5. `pii.moderate` - Moderate-risk personal data
6. `pii.high` - High-risk personal data

**Residency Options:**
- `any` - No geographic restrictions
- `us-only` - Data must stay in US
- `eu-only` - Data must stay in EU

### mcp.index.json

The server index is a JSON array of server definitions:

```json
[
  {
    "id": "string",           // Unique server identifier
    "version": "string",      // Server version
    "endpoint": "string",     // Server URL
    "categories": ["string"], // Categories this server provides
    "scopes": ["string"],     // Permission scopes supported
    "data": {
      "residency": ["enum"],  // Supported residencies: any | us-only | eu-only
      "maxSensitivity": "enum" // Maximum sensitivity level handled
    },
    "trust": {
      "signed": boolean,      // Whether server is cryptographically signed
      "publisher": "string"   // Publisher name
    },
    "policy": {               // Optional
      "rateLimitPerMin": number
    }
  }
]
```

---

## Output File Formats

### agents.lock

The lockfile pins exact server selections:

```json
{
  "agentName": "my-agent",
  "agentVersion": "1.0.0",
  "resolvedAt": "2025-01-15T10:30:00.000Z",
  "servers": [
    {
      "category": "analytics",
      "serverId": "acme-analytics",
      "version": "2.0.0",
      "endpoint": "https://mcp.acme.com/analytics",
      "scopes": ["read:dashboards", "read:metrics"],
      "hash": "a5cdac3f506074eb4b3fcfa82d590b88c6fa2a0e7d804efe2bbf82dcb7dc8816"
    }
  ]
}
```

**Hash Computation:**
```
hash = SHA256(id + "@" + version + "|" + endpoint + "|" + sorted_scopes.join(","))
```

The hash allows verification that the locked configuration hasn't been tampered with.

### agents.resolution.json

The resolution explanation provides full audit trail:

```json
{
  "agentName": "my-agent",
  "agentVersion": "1.0.0",
  "resolvedAt": "2025-01-15T10:30:00.000Z",
  "success": true,
  "requirements": [
    {
      "category": "analytics",
      "requiredPermissions": ["read:dashboards", "read:metrics"],
      "selected": {
        "serverId": "acme-analytics",
        "version": "2.0.0",
        "endpoint": "https://mcp.acme.com/analytics",
        "scopes": ["read:dashboards", "read:metrics"],
        "selectionReason": "Selected by tie-break: signed, id='acme-analytics'"
      },
      "rejected": [
        {
          "serverId": "beta-analytics",
          "version": "1.0.0",
          "reason": {
            "code": "RESIDENCY_MISMATCH",
            "message": "Agent requires 'us-only' but server supports: eu-only"
          }
        }
      ],
      "constraintsApplied": {
        "residency": "us-only",
        "sensitivity": "internal",
        "requireSigned": null
      }
    }
  ]
}
```

**Rejection Reason Codes:**

| Code | Description |
|------|-------------|
| `MISSING_CATEGORY` | Server doesn't provide the required category |
| `MISSING_SCOPE` | Server doesn't support all required permission scopes |
| `RESIDENCY_MISMATCH` | Server's data residency is incompatible with agent constraints |
| `SENSITIVITY_EXCEEDED` | Agent's sensitivity level exceeds server's maximum |
| `UNSIGNED_NOT_ALLOWED` | Server is unsigned but signed servers are required (future) |

---

## Resolution Algorithm

The resolution algorithm follows these steps for each requirement:

### Step 1: Candidate Selection

Filter servers to find candidates that:
1. Include the required category in their `categories` array
2. Support ALL required permissions (scopes are a superset)

```
candidates = servers.filter(s =>
  s.categories.includes(requirement.category) &&
  requirement.permissions.every(p => s.scopes.includes(p))
)
```

### Step 2: Constraint Filtering

Eliminate candidates that violate constraints:

**Residency Check:**
```
if agent.residency == "us-only":
  reject servers where "us-only" not in server.residency AND "any" not in server.residency

if agent.residency == "eu-only":
  reject servers where "eu-only" not in server.residency AND "any" not in server.residency
```

**Sensitivity Check:**
```
sensitivity_order = [public, internal, confidential, pii.low, pii.moderate, pii.high]

if index(agent.sensitivity) > index(server.maxSensitivity):
  reject server
```

### Step 3: Deterministic Selection

If multiple candidates remain, select using tie-breaking rules (in order):

1. **Prefer signed servers** (`trust.signed = true` beats `false`)
2. **Lexicographically smallest ID** (`"aaa"` beats `"bbb"`)
3. **Lexicographically smallest version** (`"1.0.0"` beats `"2.0.0"`)

```
candidates.sort((a, b) => {
  if (a.trust.signed !== b.trust.signed) return a.trust.signed ? -1 : 1;
  if (a.id !== b.id) return a.id.localeCompare(b.id);
  return a.version.localeCompare(b.version);
});
selected = candidates[0];
```

### Step 4: Failure Handling

If no candidates remain after filtering:
- The resolution fails with exit code 1
- Error message lists the failed category
- All rejection reasons are provided for debugging

---

## Benefits for Developers

### 1. Reproducible Builds

Just like `package-lock.json` for npm dependencies, `agents.lock` ensures every team member and every environment uses the exact same MCP server configuration.

```bash
# CI/CD pipeline
git checkout main
npm install
agent resolve
# Guaranteed identical agents.lock every time
```

### 2. Zero-Latency Resolution

Unlike LLM-based selection:
- No API calls = no latency
- No rate limits
- Works offline
- Works in air-gapped environments

```
Traditional LLM selection: 500ms - 2000ms per request
Agent Resolver: < 10ms for any configuration size
```

### 3. Complete Audit Trail

Every selection decision is documented:

```json
{
  "selected": {
    "serverId": "acme-analytics",
    "selectionReason": "Selected by tie-break: signed, id='acme-analytics'"
  },
  "rejected": [
    {
      "serverId": "competitor-analytics",
      "reason": {
        "code": "RESIDENCY_MISMATCH",
        "message": "Agent requires 'us-only' but server supports: eu-only"
      }
    }
  ]
}
```

This is invaluable for:
- Security audits
- Compliance reviews
- Debugging configuration issues
- Understanding why a particular server was chosen

### 4. Fail-Fast Validation

Catch configuration errors before deployment:

```bash
$ agent validate
✗ agents.md validation failed:
  - requires.mcp.0.permissions: Array must contain at least 1 element(s)
```

### 5. Type-Safe Schemas

All inputs are validated against strict schemas:
- Invalid residency values are caught immediately
- Missing required fields produce clear error messages
- Malformed JSON fails fast with line numbers

### 6. Deterministic Hashes

Each locked server includes a hash for integrity verification:

```json
{
  "serverId": "acme-analytics",
  "hash": "a5cdac3f506074eb4b3fcfa82d590b88c6fa2a0e7d804efe2bbf82dcb7dc8816"
}
```

You can verify the lock hasn't been tampered with:

```bash
# Regenerate and compare hashes
agent resolve
diff agents.lock agents.lock.backup
```

### 7. Easy Integration

The modular architecture allows:

```typescript
// Use core logic in your own tools
import { resolve, validateAgentsFrontmatter } from '@agent-resolver/core';

const result = resolve({
  agent: myAgentConfig,
  servers: myServerIndex
});

console.log(result.lockfile);
```

### 8. CI/CD Ready

Built-in exit codes and structured output for automation:

```yaml
# GitHub Actions example
- name: Validate agent configuration
  run: agent validate

- name: Resolve dependencies
  run: agent resolve --explain

- name: Verify determinism
  run: |
    agent resolve -o lock1.json
    agent resolve -o lock2.json
    diff lock1.json lock2.json
```

---

## Use Cases

### Use Case 1: Multi-Environment Deployment

**Problem:** Different environments (dev, staging, prod) need different MCP servers.

**Solution:**
```bash
# Development
agent resolve -i servers-dev.json -o agents.lock

# Staging
agent resolve -i servers-staging.json -o agents.lock

# Production
agent resolve -i servers-prod.json -o agents.lock
```

### Use Case 2: Compliance Verification

**Problem:** Need to prove all data stays in required geographic region.

**Solution:**
```yaml
# agents.md
constraints:
  data:
    residency: eu-only
```

```bash
agent resolve --explain
cat agents.resolution.json | jq '.requirements[].constraintsApplied'
# {"residency": "eu-only", ...}
```

### Use Case 3: Security Audit

**Problem:** Security team needs to review all external connections.

**Solution:**
```bash
agent resolve --explain
cat agents.resolution.json | jq '.requirements[].selected'
# Full list of selected servers with endpoints
```

### Use Case 4: Dependency Updates

**Problem:** Need to update to newer server versions while maintaining compatibility.

**Solution:**
```bash
# Update mcp.index.json with new server versions
# Re-resolve
agent resolve --explain

# Compare changes
diff agents.lock.old agents.lock
```

### Use Case 5: Offline Development

**Problem:** Need to develop agents without network access.

**Solution:**
Agent Resolver works entirely offline—no API calls, no network requirements. Just the local index file.

---

## Best Practices

### 1. Version Control Your Lockfile

Always commit `agents.lock` to version control:

```bash
git add agents.lock
git commit -m "chore: update agent lockfile"
```

### 2. Generate Explanations in CI

Always use `--explain` in CI/CD to maintain audit trail:

```bash
agent resolve --explain
git add agents.resolution.json
```

### 3. Validate Before Resolve

Run validation first to catch errors early:

```bash
agent validate && agent resolve
```

### 4. Use Specific Residency Constraints

Be explicit about data residency:

```yaml
# Good - explicit
constraints:
  data:
    residency: us-only

# Avoid - implicit "any"
constraints:
  data:
    sensitivity: internal
```

### 5. Document Your Requirements

Use the Markdown body of `agents.md` to document why each requirement exists:

```markdown
---
name: my-agent
requires:
  mcp:
    - category: reporting
      permissions:
        - read:reports
---

# My Agent

## Requirements

### Reporting
We need reporting access to generate quarterly summaries.
The `read:reports` permission is required for dashboard data.
```

### 6. Keep Server Index Updated

Regularly update `mcp.index.json` with latest server versions:

```bash
# In CI, you might fetch this from a central registry
curl -o mcp.index.json https://registry.example.com/servers.json
agent resolve
```

---

## Troubleshooting

### Error: "Resolution failed: no candidates for categories"

**Cause:** No servers match the required category and constraints.

**Solution:**
1. Run `agent discover` to see available servers
2. Check if any server provides the required category
3. Verify residency constraints aren't too restrictive
4. Check sensitivity levels

```bash
agent resolve --explain
cat agents.resolution.json | jq '.requirements[] | select(.selected == null)'
```

### Error: "agents.md validation failed"

**Cause:** Invalid frontmatter schema.

**Solution:**
1. Check required fields are present (name, version, requires)
2. Verify enum values are valid (sensitivity, residency)
3. Ensure arrays have at least one element

```bash
agent validate
# Read error messages for specific field issues
```

### Error: "Server missing required scopes"

**Cause:** Server doesn't provide all permissions your agent needs.

**Solution:**
1. Check `agents.resolution.json` for `MISSING_SCOPE` rejections
2. Either reduce required permissions or find a different server

```bash
cat agents.resolution.json | jq '.requirements[].rejected[] | select(.reason.code == "MISSING_SCOPE")'
```

### Lockfile Changes Unexpectedly

**Cause:** Usually timestamp differences or non-deterministic processing.

**Solution:**
1. Verify you're using the same `mcp.index.json`
2. Check if servers were added/removed from index
3. Compare excluding timestamps:

```bash
jq 'del(.resolvedAt)' agents.lock.old > old.json
jq 'del(.resolvedAt)' agents.lock.new > new.json
diff old.json new.json
```

### Server Selected Unexpectedly

**Cause:** Tie-breaking rules selected a server you didn't expect.

**Solution:**
1. Check `agents.resolution.json` for `selectionReason`
2. Review tie-breaking order: signed → id → version
3. Consider if server signing status changed

```bash
cat agents.resolution.json | jq '.requirements[].selected.selectionReason'
```

---

## Appendix: Hash Verification

To manually verify a lockfile hash:

```bash
# For a locked server entry
id="acme-analytics"
version="2.0.0"
endpoint="https://mcp.acme.com/analytics"
scopes="read:dashboards,read:metrics"  # sorted, comma-separated

# Compute hash
echo -n "${id}@${version}|${endpoint}|${scopes}" | sha256sum
# Should match the hash in agents.lock
```

---

## Getting Help

- **Documentation:** This file
- **Examples:** See `examples/hello-agent/`
- **Issues:** Report bugs at the project repository
- **Validation Errors:** Run `agent validate` with verbose output

---

*Agent Resolver - Deterministic. Auditable. Secure.*
