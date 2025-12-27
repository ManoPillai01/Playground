# Agent Resolver Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [The Problem](#the-problem)
3. [The Solution](#the-solution)
4. [Key Concepts](#key-concepts)
5. [Architecture](#architecture)
6. [Installation](#installation)
7. [Quick Start](#quick-start)
8. [Configuration](#configuration)
9. [CLI Reference](#cli-reference)
10. [Registry Management](#registry-management)
11. [Policy System](#policy-system)
12. [Input File Formats](#input-file-formats)
13. [Output File Formats](#output-file-formats)
14. [Resolution Algorithm](#resolution-algorithm)
15. [Enterprise Features](#enterprise-features)
16. [Benefits for Developers](#benefits-for-developers)
17. [Use Cases](#use-cases)
18. [Best Practices](#best-practices)
19. [Troubleshooting](#troubleshooting)

---

## Introduction

Agent Resolver is a **deterministic command-line tool** for resolving AI agent requirements against available MCP (Model Context Protocol) servers. It produces auditable, reproducible toolchain selections without requiring any LLM calls or network requests.

Think of it as a "package manager" for agent capabilities—just as `npm` or `pip` resolves package dependencies, Agent Resolver resolves which MCP servers an agent should connect to based on its requirements and constraints.

### What Makes It Different?

- **100% Deterministic**: Same inputs always produce byte-identical outputs
- **Fully Offline**: No API calls, no network requests, no LLM reasoning
- **Auditable**: Every decision includes machine-readable reason codes
- **Safe by Default**: Fails with actionable errors when constraints can't be satisfied
- **GitOps-Friendly**: Use git repositories as registries with PR-based approvals

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
         │     │  Policies   │   │  Resolution  │         │
         │     │   Merge     │   │   Algorithm  │         │
         │     └─────────────┘   └──────────────┘         │
         │                                                │
         ▼                                                ▼
┌─────────────────┐                            ┌──────────────────────┐
│  Registries     │                            │ agents.resolution.json│
│  (git/file)     │                            │ (audit trail)        │
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

### Registries

**Registries** are sources of MCP server definitions:
- **File registries**: Local JSON files
- **Git registries**: Git repositories synced locally (GitOps pattern)

### Policies

**Policies** are organization or team rules that constrain resolution:
- Can require signed servers
- Can enforce residency/sensitivity
- Can forbid or allow specific servers
- Policies can only tighten constraints, never loosen

### Constraints

**Constraints** define rules that must be satisfied:
- **Residency**: Where data can be stored ("us-only", "eu-only", "any")
- **Sensitivity**: Maximum data classification level the agent handles

### Resolution

**Resolution** is the process of matching requirements to available servers while respecting constraints and policies. The output is a deterministic selection pinned in a lockfile.

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
│   │   ├── resolution.ts     # Resolution explanation schema
│   │   ├── policy.ts         # Policy schema
│   │   └── config.ts         # Configuration schema
│   │
│   ├── core/            # Pure business logic (no I/O)
│   │   ├── resolver.ts       # Resolution algorithm
│   │   ├── validate.ts       # Schema validation
│   │   ├── hash.ts           # Deterministic hashing
│   │   ├── federation.ts     # Multi-index merging
│   │   └── policy.ts         # Policy evaluation
│   │
│   └── cli/             # Command-line interface
│       ├── index.ts          # CLI entry point
│       └── commands/
│           ├── validate.ts   # agent validate
│           ├── discover.ts   # agent discover
│           ├── resolve.ts    # agent resolve
│           ├── sync.ts       # agent sync
│           ├── policy.ts     # agent policy
│           └── config.ts     # agent config
│
└── examples/
    └── hello-agent/     # Working example
```

### Design Principles

1. **Pure Core**: The `core` package has no file system or network dependencies. It's pure TypeScript that takes data in and returns data out.

2. **Schema-First**: All data structures are defined with Zod schemas, providing runtime type validation and TypeScript type inference.

3. **GitOps-Friendly**: Registries can be git repositories, enabling PR-based approval workflows.

4. **Policy as Code**: Policies are JSON files that can be version-controlled and reviewed.

---

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher
- Git (for git registry sync)

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

---

## Quick Start

### Step 1: Initialize Configuration

```bash
agent config init
```

This creates `.agentrc.json` with default settings.

### Step 2: Create Your Agent Definition

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

### Step 3: Create Your MCP Server Index

Create `mcp.index.json`:

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
  }
]
```

### Step 4: Validate, Check Policies, and Resolve

```bash
# Validate configuration
agent validate

# Check against policies (if configured)
agent policy check

# Resolve and generate lockfile
agent resolve --explain
```

---

## Configuration

### Configuration File (.agentrc.json)

Agent Resolver uses `.agentrc.json` for project configuration:

```json
{
  "registries": [
    {
      "name": "local",
      "type": "file",
      "path": "./mcp.index.json"
    },
    {
      "name": "org",
      "type": "git",
      "url": "git@github.com:myorg/mcp-registry.git",
      "branch": "main",
      "path": "servers/"
    }
  ],
  "policies": [
    "./org-policy.json",
    "./team-policy.json"
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
    "webhook": "https://audit.example.com/log"
  }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `registries` | Array of registry sources | `[]` |
| `policies` | Array of policy file paths | `[]` |
| `cache.path` | Directory for cached registries | `.agent-cache` |
| `cache.ttl` | Cache time-to-live in seconds | `3600` |
| `resolve.output` | Output path for lockfile | `./agents.lock` |
| `resolve.explainOutput` | Output path for explanation | `./agents.resolution.json` |
| `resolve.alwaysExplain` | Always generate explanation | `false` |
| `audit.webhook` | URL to POST resolution results | `null` |

### Registry Types

**File Registry:**
```json
{
  "name": "local",
  "type": "file",
  "path": "./mcp.index.json"
}
```

**Git Registry:**
```json
{
  "name": "org",
  "type": "git",
  "url": "git@github.com:myorg/mcp-registry.git",
  "branch": "main",
  "path": "servers/"
}
```

---

## CLI Reference

### Global Options

```
agent [command] [options]

Options:
  -V, --version  Output version number
  -h, --help     Display help

Commands:
  validate       Validate agents.md and mcp.index.json
  discover       List available MCP servers
  resolve        Resolve and generate lockfile
  sync           Sync git registries
  policy         Policy management
  config         Configuration management
```

### agent validate

Validates the schema of `agents.md` frontmatter and `mcp.index.json`.

```bash
agent validate [options]

Options:
  -a, --agents <path>  Path to agents.md file (default: "./agents.md")
  -i, --index <path>   Path to mcp.index.json file (default: "./mcp.index.json")
```

### agent discover

Lists available MCP servers grouped by category.

```bash
agent discover [options]

Options:
  -i, --index <path>   Path to mcp.index.json file (default: "./mcp.index.json")
```

### agent resolve

Resolves agent requirements and generates a lockfile.

```bash
agent resolve [options]

Options:
  -a, --agents <path>         Path to agents.md file (default: "./agents.md")
  -i, --index <path...>       Path(s) to mcp.index.json file(s)
  -o, --output <path>         Path to output agents.lock
  -e, --explain               Also write agents.resolution.json
  --explain-output <path>     Path to resolution output
  --audit-webhook <url>       Send resolution to audit webhook
  --dry-run                   Show what would happen without writing
```

**Examples:**

```bash
# Basic resolve
agent resolve

# Resolve with explanation
agent resolve --explain

# Merge multiple indexes
agent resolve -i org-servers.json -i team-servers.json

# Dry run to preview
agent resolve --dry-run

# Send to audit system
agent resolve --audit-webhook https://audit.example.com/log
```

### agent sync

Syncs git registries to local cache.

```bash
agent sync [options]

Options:
  -c, --cache <path>    Cache directory path
  --registry <name>     Sync only specific registry

Subcommands:
  agent sync status     Show sync status of all registries
```

**Examples:**

```bash
# Sync all git registries
agent sync

# Check sync status
agent sync status

# Sync specific registry
agent sync --registry org
```

### agent policy

Policy management commands.

```bash
agent policy <subcommand>

Subcommands:
  list                  List configured policies
  check                 Check agent against policies (dry-run)
  effective             Show effective constraints after merge
```

**Examples:**

```bash
# List all policies
agent policy list

# Check agent against policies
agent policy check

# Show merged constraints
agent policy effective
```

### agent config

Configuration management.

```bash
agent config <subcommand>

Subcommands:
  init                  Create new .agentrc.json
  show                  Display current configuration
  path                  Show config file path
```

---

## Registry Management

### GitOps Pattern

Use git repositories as your source of truth for MCP server definitions:

```
org-mcp-registry/              (Git repository)
├── servers/
│   ├── acme-audiences.json
│   ├── acme-reporting.json
│   └── index.json            (combined index)
├── policies/
│   └── org-baseline.json
└── CODEOWNERS                 (@security-team for policies)
```

### Syncing Registries

```bash
# Configure git registry in .agentrc.json
{
  "registries": [
    {
      "name": "org",
      "type": "git",
      "url": "git@github.com:myorg/mcp-registry.git",
      "branch": "main",
      "path": "servers/"
    }
  ]
}

# Sync to local cache
agent sync

# Check status
agent sync status
# Output:
#   org:
#     Type: git
#     Commit: a1b2c3d
#     Synced: 2025-01-15T10:30:00.000Z
```

### Offline Mode

After syncing, resolution works entirely offline:

```bash
# Sync once while online
agent sync

# Work offline
agent resolve  # Uses cached registry
```

### Benefits of GitOps

| Feature | How Git Provides It |
|---------|---------------------|
| Versioning | Git tags and commits |
| Approval workflow | Pull request reviews |
| Audit trail | Git history |
| Rollback | `git revert` |
| Access control | Repository permissions |

---

## Policy System

### Policy Overview

Policies allow organizations to enforce constraints across all agents:

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
      "severity": "error",
      "message": "All MCP servers must be cryptographically signed"
    }
  ]
}
```

### Policy Rule Types

| Type | Description | Value |
|------|-------------|-------|
| `require-signed` | Require signed servers | `boolean` |
| `require-residency` | Enforce data residency | `"us-only"` \| `"eu-only"` |
| `require-sensitivity` | Set minimum sensitivity | Sensitivity level |
| `forbid-server` | Block specific server | Server ID |
| `allow-server` | Whitelist servers | Array of server IDs |

### Policy Hierarchy

Policies are applied in priority order (lower first, higher last):

```
Agent Constraints (base)
       ↓
Team Policy (priority: 50)
       ↓
Org Policy (priority: 100)
       ↓
Compliance Policy (priority: 1000)
```

**Important:** Policies can only **tighten** constraints, never loosen them.

### Policy Examples

**Security Baseline:**
```json
{
  "id": "security-baseline",
  "name": "Security Baseline",
  "version": "1.0.0",
  "priority": 100,
  "rules": [
    {
      "id": "require-signed",
      "type": "require-signed",
      "value": true,
      "severity": "error",
      "message": "Only signed servers allowed"
    }
  ]
}
```

**EU Data Residency:**
```json
{
  "id": "eu-data-policy",
  "name": "EU Data Residency",
  "version": "1.0.0",
  "priority": 50,
  "rules": [
    {
      "id": "eu-residency",
      "type": "require-residency",
      "value": "eu-only",
      "severity": "error",
      "message": "Data must stay in EU"
    }
  ]
}
```

### Checking Policies

```bash
# Check agent against all configured policies
agent policy check

# Output:
# Checking 'my-agent@1.0.0' against 2 policies...
#
# Policies Applied:
#   Organization Security Baseline (org-security-baseline)
#     • require-signed-servers
#   EU Data Policy (eu-data-policy)
#     • eu-residency
#
# Effective Constraints:
#   Require Signed: true
#   Residency: eu-only
#   Sensitivity: internal
#
# ✓ Policy check passed
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
      "residency": ["enum"],  // Supported residencies
      "maxSensitivity": "enum" // Maximum sensitivity level
    },
    "trust": {
      "signed": boolean,      // Whether cryptographically signed
      "publisher": "string"   // Publisher name
    },
    "policy": {               // Optional
      "rateLimitPerMin": number
    }
  }
]
```

### Policy Files

Policy files are JSON with the following structure:

```json
{
  "id": "string",           // Unique policy identifier
  "name": "string",         // Human-readable name
  "version": "string",      // Policy version
  "priority": number,       // Application order (higher = later)
  "rules": [
    {
      "id": "string",       // Rule identifier
      "type": "string",     // Rule type
      "value": any,         // Rule value
      "severity": "error" | "warning",
      "message": "string"   // Human-readable message
    }
  ]
}
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
      "rejected": [...],
      "constraintsApplied": {
        "residency": "us-only",
        "sensitivity": "internal",
        "requireSigned": true
      }
    }
  ]
}
```

**Rejection Reason Codes:**

| Code | Description |
|------|-------------|
| `MISSING_CATEGORY` | Server doesn't provide the required category |
| `MISSING_SCOPE` | Server doesn't support all required scopes |
| `RESIDENCY_MISMATCH` | Server's residency is incompatible |
| `SENSITIVITY_EXCEEDED` | Agent's sensitivity exceeds server's max |
| `UNSIGNED_NOT_ALLOWED` | Server is unsigned but policy requires signed |

---

## Resolution Algorithm

### Step 1: Load and Merge

1. Load all registries (file and cached git)
2. Merge server indexes (later registries override)
3. Load and merge policies
4. Compute effective constraints

### Step 2: Candidate Selection

For each requirement, filter servers that:
1. Include the required category
2. Support ALL required permissions

### Step 3: Constraint Filtering

Eliminate candidates that violate:
- Residency requirements
- Sensitivity limits
- Policy rules (require-signed, forbid-server, etc.)

### Step 4: Deterministic Selection

If multiple candidates remain, select using tie-breaking:
1. Prefer signed servers (`trust.signed = true`)
2. Lexicographically smallest ID
3. Lexicographically smallest version

### Step 5: Output

Generate lockfile and optional explanation with full audit trail.

---

## Enterprise Features

### Audit Webhooks

Send resolution results to an external audit system:

```bash
# Via CLI flag
agent resolve --audit-webhook https://audit.example.com/log

# Or in .agentrc.json
{
  "audit": {
    "webhook": "https://audit.example.com/log"
  }
}
```

**Webhook Payload:**
```json
{
  "event": "resolution",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "agent": {
    "name": "my-agent",
    "version": "1.0.0"
  },
  "lockfile": { ... },
  "explanation": { ... },
  "environment": {
    "user": "developer",
    "ci": false
  }
}
```

### Multi-Index Federation

Merge servers from multiple sources:

```bash
# Multiple indexes on command line
agent resolve -i org-servers.json -i team-servers.json -i local.json

# Or in .agentrc.json
{
  "registries": [
    { "name": "org", "type": "git", "url": "..." },
    { "name": "team", "type": "file", "path": "./team-servers.json" },
    { "name": "local", "type": "file", "path": "./local.json" }
  ]
}
```

**Merge Rules:**
- Servers are merged by `id@version` key
- Later registries override earlier ones
- Result is sorted deterministically

### Dry Run Mode

Preview resolution without writing files:

```bash
agent resolve --dry-run

# Output:
# Applied 2 policies
# Resolving agent 'my-agent@1.0.0'...
#
# Dry run - would write:
#   ./agents.lock
#
# Lockfile preview:
# { ... }
```

---

## Benefits for Developers

### 1. Reproducible Builds

Just like `package-lock.json`, `agents.lock` ensures identical configurations everywhere.

### 2. Zero-Latency Resolution

No API calls, no rate limits, works offline.

### 3. Complete Audit Trail

Every decision is documented with reason codes.

### 4. GitOps Integration

Use git for registries: versioning, PRs, audit trail—all free.

### 5. Policy as Code

Centralized governance that's version-controlled and reviewable.

### 6. Fail-Fast Validation

Catch configuration errors before deployment.

### 7. CI/CD Ready

```yaml
- name: Sync registries
  run: agent sync

- name: Check policies
  run: agent policy check

- name: Resolve
  run: agent resolve --explain
```

---

## Use Cases

### Multi-Environment Deployment

```bash
# Development
agent resolve -i servers-dev.json

# Production
agent sync  # Get latest from org registry
agent resolve
```

### Compliance Verification

```bash
# Check policies before deploy
agent policy check
agent resolve --explain

# Send to audit system
agent resolve --audit-webhook https://compliance.example.com
```

### Offline Development

```bash
# Sync once while online
agent sync

# Work offline indefinitely
agent resolve
```

---

## Best Practices

### 1. Use Git Registries

Store server definitions in git for versioning and approval workflows.

### 2. Implement Policies

Start with a security baseline policy requiring signed servers.

### 3. Sync in CI/CD

```yaml
- run: agent sync
- run: agent policy check
- run: agent resolve --explain
```

### 4. Commit Lockfiles

Always commit `agents.lock` for reproducibility.

### 5. Use Dry Run

Preview changes before writing:
```bash
agent resolve --dry-run
```

### 6. Enable Audit Logging

Configure a webhook for compliance:
```json
{ "audit": { "webhook": "https://..." } }
```

---

## Troubleshooting

### Error: "Registry not synced"

```bash
# Solution: Sync the registry
agent sync
```

### Error: "Policy violations"

```bash
# Check which policies are failing
agent policy check

# Review effective constraints
agent policy effective
```

### Error: "No server indexes found"

```bash
# Ensure config exists
agent config show

# Or specify index directly
agent resolve -i ./mcp.index.json
```

### Lockfile Changes Unexpectedly

```bash
# Compare excluding timestamps
jq 'del(.resolvedAt)' agents.lock.old > old.json
jq 'del(.resolvedAt)' agents.lock.new > new.json
diff old.json new.json
```

---

## Appendix: Hash Verification

To manually verify a lockfile hash:

```bash
id="acme-analytics"
version="2.0.0"
endpoint="https://mcp.acme.com/analytics"
scopes="read:dashboards,read:metrics"  # sorted, comma-separated

echo -n "${id}@${version}|${endpoint}|${scopes}" | sha256sum
```

---

*Agent Resolver - Deterministic. Auditable. GitOps-Ready.*
