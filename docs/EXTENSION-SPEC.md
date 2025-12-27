# EXTENSION-SPEC.md — Enterprise Registry & Policy Framework

## Overview

This specification extends the Agent Resolver with enterprise capabilities:

1. **Private Registries** — Centralized MCP server and agent registries
2. **Policy Framework** — Organization-wide governance policies
3. **Hooks System** — Extensibility points for custom logic
4. **Audit & Compliance** — Enhanced tracking for enterprise requirements

These extensions maintain the core principles:
- Deterministic when policies are pinned
- Auditable with full decision trails
- Fail-safe with clear error messages

---

## 1. Private Registry Architecture

### 1.1 Registry Types

```
┌─────────────────────────────────────────────────────────────────┐
│                     Enterprise Registry                         │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   MCP Registry      │   Agent Registry    │   Policy Registry   │
│                     │                     │                     │
│ • Server metadata   │ • Agent definitions │ • Org policies      │
│ • Version history   │ • Version history   │ • Team policies     │
│ • Trust chains      │ • Ownership         │ • Approval rules    │
│ • Deprecations      │ • Dependencies      │ • Constraints       │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### 1.2 MCP Server Registry

**Endpoint:** `GET /api/v1/mcp/servers`

```typescript
interface McpRegistryConfig {
  url: string;                    // Registry base URL
  auth: {
    type: 'api-key' | 'oauth2' | 'mtls';
    credentials: string;          // Reference to secret store
  };
  cache: {
    ttl: number;                  // Cache TTL in seconds
    path: string;                 // Local cache path
  };
  fallback: {
    enabled: boolean;             // Use cache if registry unreachable
    maxAge: number;               // Max cache age for fallback
  };
}
```

**Registry Response Schema:**

```typescript
interface McpRegistryResponse {
  servers: McpServer[];
  metadata: {
    version: string;              // Registry schema version
    generatedAt: string;          // ISO timestamp
    hash: string;                 // Content hash for caching
  };
  policies: {
    globalConstraints?: PolicyConstraints;  // Org-wide constraints
    deprecations: Deprecation[];
  };
}

interface Deprecation {
  serverId: string;
  version?: string;               // If null, all versions deprecated
  reason: string;
  deadline: string;               // ISO date
  replacement?: {
    serverId: string;
    version: string;
  };
}
```

### 1.3 Agent Registry

**Endpoint:** `GET /api/v1/agents`

```typescript
interface AgentRegistryEntry {
  id: string;
  name: string;
  version: string;
  owner: {
    team: string;
    contact: string;
  };
  definition: AgentsFrontmatter;  // The agents.md content
  status: 'draft' | 'review' | 'approved' | 'deprecated';
  approvals: Approval[];
  dependencies: AgentDependency[];
  createdAt: string;
  updatedAt: string;
}

interface AgentDependency {
  agentId: string;
  versionRange: string;           // Semver range
}

interface Approval {
  approver: string;
  role: string;
  timestamp: string;
  signature?: string;             // Optional cryptographic signature
}
```

### 1.4 Offline Mode with Registry Sync

```bash
# Sync registry to local cache for offline use
agent registry sync --output ./registry-cache/

# Resolve using cached registry
agent resolve --registry ./registry-cache/

# Check cache freshness
agent registry status
```

**Cache Structure:**

```
registry-cache/
├── mcp-servers.json          # Cached server index
├── agents/                   # Cached agent definitions
│   ├── my-agent@1.0.0.json
│   └── my-agent@1.1.0.json
├── policies/                 # Cached policies
│   ├── org-policy.json
│   └── team-data.json
└── manifest.json             # Cache metadata & signatures
```

---

## 2. Policy Framework

### 2.1 Policy Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                     Policy Resolution Order                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Agent Definition (agents.md)                               │
│      └── Base requirements and constraints                      │
│                                                                 │
│   2. Team Policy (team-policy.json)                             │
│      └── Team-specific overrides and additions                  │
│                                                                 │
│   3. Organization Policy (org-policy.json)                      │
│      └── Org-wide mandatory constraints                         │
│                                                                 │
│   4. Compliance Policy (compliance-policy.json)                 │
│      └── Regulatory requirements (cannot be overridden)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Merge Strategy:
- Later policies can TIGHTEN constraints, never loosen
- Compliance policies are immutable overrides
```

### 2.2 Policy Schema

```typescript
interface Policy {
  id: string;
  version: string;
  name: string;
  description: string;
  priority: number;               // Higher = applied later
  scope: PolicyScope;
  rules: PolicyRule[];
  effectiveDate: string;
  expirationDate?: string;
}

interface PolicyScope {
  type: 'organization' | 'team' | 'project' | 'agent';
  targets: string[];              // IDs of targeted entities
  excludes?: string[];            // Exceptions
}

interface PolicyRule {
  id: string;
  type: PolicyRuleType;
  condition?: PolicyCondition;    // When to apply
  action: PolicyAction;
  severity: 'warning' | 'error';  // Warn or block
  message: string;
}

type PolicyRuleType =
  | 'require-constraint'          // Enforce a constraint
  | 'forbid-server'               // Block specific servers
  | 'require-server'              // Mandate specific servers
  | 'require-approval'            // Need approval for resolution
  | 'require-signed'              // Only signed servers
  | 'max-servers'                 // Limit number of servers
  | 'allowed-categories'          // Whitelist categories
  | 'forbidden-scopes';           // Blacklist scopes
```

### 2.3 Policy Examples

**Organization Security Policy:**

```json
{
  "id": "org-security-baseline",
  "version": "2.0.0",
  "name": "Organization Security Baseline",
  "priority": 100,
  "scope": {
    "type": "organization",
    "targets": ["*"]
  },
  "rules": [
    {
      "id": "require-signed-servers",
      "type": "require-signed",
      "action": { "enforce": true },
      "severity": "error",
      "message": "All MCP servers must be cryptographically signed"
    },
    {
      "id": "block-deprecated-servers",
      "type": "forbid-server",
      "condition": {
        "field": "status",
        "operator": "equals",
        "value": "deprecated"
      },
      "action": { "enforce": true },
      "severity": "error",
      "message": "Deprecated servers are not allowed"
    },
    {
      "id": "pii-requires-approval",
      "type": "require-approval",
      "condition": {
        "field": "constraints.data.sensitivity",
        "operator": "in",
        "value": ["pii.low", "pii.moderate", "pii.high"]
      },
      "action": {
        "approvers": ["security-team", "privacy-team"],
        "minApprovals": 1
      },
      "severity": "error",
      "message": "PII handling requires security team approval"
    }
  ]
}
```

**Team Data Residency Policy:**

```json
{
  "id": "team-eu-data",
  "version": "1.0.0",
  "name": "EU Data Team Policy",
  "priority": 50,
  "scope": {
    "type": "team",
    "targets": ["eu-analytics-team"]
  },
  "rules": [
    {
      "id": "enforce-eu-residency",
      "type": "require-constraint",
      "action": {
        "constraint": "data.residency",
        "value": "eu-only",
        "merge": "strictest"
      },
      "severity": "error",
      "message": "EU team agents must use EU-only data residency"
    }
  ]
}
```

**Compliance Policy (HIPAA):**

```json
{
  "id": "hipaa-compliance",
  "version": "1.0.0",
  "name": "HIPAA Compliance Requirements",
  "priority": 1000,
  "scope": {
    "type": "project",
    "targets": ["healthcare-*"]
  },
  "rules": [
    {
      "id": "hipaa-sensitivity",
      "type": "require-constraint",
      "action": {
        "constraint": "data.sensitivity",
        "value": "pii.high",
        "merge": "override"
      },
      "severity": "error",
      "message": "Healthcare projects must declare PII-high sensitivity"
    },
    {
      "id": "hipaa-servers-only",
      "type": "require-server",
      "action": {
        "serverIds": ["hipaa-certified-*"],
        "exclusive": true
      },
      "severity": "error",
      "message": "Only HIPAA-certified servers are allowed"
    },
    {
      "id": "hipaa-audit-logging",
      "type": "require-approval",
      "action": {
        "approvers": ["compliance-officer"],
        "minApprovals": 1,
        "requireSignature": true
      },
      "severity": "error",
      "message": "HIPAA agents require compliance officer sign-off"
    }
  ]
}
```

### 2.4 Policy Resolution Output

```json
{
  "agentName": "healthcare-agent",
  "policiesApplied": [
    {
      "id": "org-security-baseline",
      "version": "2.0.0",
      "rulesTriggered": ["require-signed-servers"]
    },
    {
      "id": "hipaa-compliance",
      "version": "1.0.0",
      "rulesTriggered": ["hipaa-sensitivity", "hipaa-servers-only"]
    }
  ],
  "effectiveConstraints": {
    "data": {
      "sensitivity": "pii.high",
      "residency": "us-only"
    },
    "trust": {
      "requireSigned": true
    }
  },
  "pendingApprovals": [
    {
      "ruleId": "hipaa-audit-logging",
      "approvers": ["compliance-officer"],
      "status": "pending"
    }
  ]
}
```

---

## 3. Hooks System

### 3.1 Hook Types

```
┌─────────────────────────────────────────────────────────────────┐
│                        Hook Lifecycle                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │  pre-fetch   │────▶│  pre-resolve │────▶│ post-resolve │   │
│   └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│   • Auth refresh        • Policy merge        • Audit log       │
│   • Cache check         • Validation          • Notifications   │
│   • Rate limiting       • Transformations     • Approvals       │
│                                                                 │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │  on-select   │────▶│  on-reject   │────▶│   on-error   │   │
│   └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│   • Logging             • Alerting            • Rollback        │
│   • Metrics             • Alternatives        • Escalation      │
│   • Verification        • Exemptions          • Fallback        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Hook Configuration

```typescript
interface HooksConfig {
  hooks: Hook[];
  timeout: number;                // Global timeout for hooks
  continueOnError: boolean;       // Continue if hook fails
}

interface Hook {
  id: string;
  type: HookType;
  trigger: HookTrigger;
  handler: HookHandler;
  config: Record<string, unknown>;
  enabled: boolean;
  order: number;                  // Execution order
}

type HookType =
  | 'pre-fetch'
  | 'post-fetch'
  | 'pre-resolve'
  | 'post-resolve'
  | 'on-select'
  | 'on-reject'
  | 'on-error'
  | 'on-approval-required';

type HookHandler =
  | { type: 'webhook'; url: string; method: 'GET' | 'POST'; headers?: Record<string, string> }
  | { type: 'script'; path: string; runtime: 'node' | 'python' | 'shell' }
  | { type: 'builtin'; name: string };
```

### 3.3 Hook Examples

**hooks.json:**

```json
{
  "hooks": [
    {
      "id": "audit-log",
      "type": "post-resolve",
      "trigger": { "always": true },
      "handler": {
        "type": "webhook",
        "url": "https://audit.example.com/api/v1/log",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer ${AUDIT_TOKEN}"
        }
      },
      "config": {
        "includeFullResolution": true,
        "includePolicies": true
      },
      "enabled": true,
      "order": 1
    },
    {
      "id": "slack-notification",
      "type": "on-reject",
      "trigger": {
        "condition": {
          "field": "reason.code",
          "operator": "in",
          "value": ["RESIDENCY_MISMATCH", "SENSITIVITY_EXCEEDED"]
        }
      },
      "handler": {
        "type": "webhook",
        "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
        "method": "POST"
      },
      "config": {
        "channel": "#security-alerts",
        "mentionOnPii": "@security-team"
      },
      "enabled": true,
      "order": 1
    },
    {
      "id": "custom-validation",
      "type": "pre-resolve",
      "trigger": { "always": true },
      "handler": {
        "type": "script",
        "path": "./scripts/validate-agent.js",
        "runtime": "node"
      },
      "config": {
        "strictMode": true
      },
      "enabled": true,
      "order": 1
    },
    {
      "id": "approval-workflow",
      "type": "on-approval-required",
      "trigger": { "always": true },
      "handler": {
        "type": "builtin",
        "name": "jira-approval"
      },
      "config": {
        "project": "SECURITY",
        "issueType": "Approval Request",
        "assignee": "security-approver-group"
      },
      "enabled": true,
      "order": 1
    }
  ]
}
```

### 3.4 Custom Hook Script Example

**scripts/validate-agent.js:**

```javascript
#!/usr/bin/env node

// Hook receives context via stdin
const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));

const { agent, servers, policies, config } = input;

// Custom validation logic
const errors = [];
const warnings = [];

// Example: Ensure agent has description
if (!agent.description || agent.description.length < 50) {
  warnings.push({
    code: 'MISSING_DESCRIPTION',
    message: 'Agent should have a description of at least 50 characters'
  });
}

// Example: Check for banned scopes
const bannedScopes = ['admin:*', 'delete:*'];
for (const req of agent.requires.mcp) {
  for (const perm of req.permissions) {
    if (bannedScopes.some(banned => perm.match(new RegExp(banned.replace('*', '.*'))))) {
      errors.push({
        code: 'BANNED_SCOPE',
        message: `Scope '${perm}' is not allowed by organization policy`
      });
    }
  }
}

// Output result
console.log(JSON.stringify({
  success: errors.length === 0,
  errors,
  warnings,
  metadata: {
    checkedAt: new Date().toISOString(),
    version: '1.0.0'
  }
}));

process.exit(errors.length > 0 ? 1 : 0);
```

---

## 4. Extended CLI Commands

### 4.1 Registry Commands

```bash
# Configure registry
agent config set registry.url https://registry.example.com
agent config set registry.auth.type oauth2
agent config set registry.auth.credentials "$REGISTRY_TOKEN"

# Sync registry for offline use
agent registry sync
agent registry sync --output ./cache/

# Check registry status
agent registry status
agent registry ping

# Search servers
agent registry search --category audiences
agent registry search --scope "read:*"
agent registry search --publisher "Acme Corp"

# View server details
agent registry show acme-audiences@2.1.0

# List deprecations
agent registry deprecations
```

### 4.2 Policy Commands

```bash
# List active policies
agent policy list
agent policy list --scope team

# Show policy details
agent policy show org-security-baseline

# Validate agent against policies (dry-run)
agent policy check
agent policy check --agent ./agents.md

# Show effective constraints after policy merge
agent policy effective

# Request policy exemption
agent policy request-exemption --rule require-signed --reason "Testing unsigned dev server"
```

### 4.3 Approval Commands

```bash
# List pending approvals
agent approvals list

# Request approval
agent approvals request --approver security-team

# Check approval status
agent approvals status --request-id abc123

# Resolve with approval token
agent resolve --approval-token "eyJ..."
```

### 4.4 Audit Commands

```bash
# View resolution history
agent audit log
agent audit log --agent my-agent --since 2025-01-01

# Export audit trail
agent audit export --format csv --output audit.csv

# Verify lockfile integrity
agent audit verify ./agents.lock

# Compare resolutions
agent audit diff ./agents.lock.old ./agents.lock.new
```

---

## 5. Configuration Files

### 5.1 .agentrc.json (Project Configuration)

```json
{
  "registry": {
    "url": "https://registry.example.com",
    "auth": {
      "type": "oauth2",
      "credentials": "${REGISTRY_TOKEN}"
    },
    "cache": {
      "enabled": true,
      "ttl": 3600,
      "path": "./.agent-cache"
    }
  },
  "policies": {
    "sources": [
      { "type": "registry", "path": "/policies/org" },
      { "type": "file", "path": "./team-policy.json" }
    ],
    "strictMode": true
  },
  "hooks": {
    "configPath": "./hooks.json"
  },
  "resolve": {
    "requireApproval": false,
    "allowDeprecated": false,
    "preferSigned": true
  },
  "output": {
    "lockfile": "./agents.lock",
    "explanation": "./agents.resolution.json",
    "alwaysExplain": true
  }
}
```

### 5.2 Environment Variables

```bash
# Registry authentication
AGENT_REGISTRY_URL=https://registry.example.com
AGENT_REGISTRY_TOKEN=eyJ...

# Policy overrides (for CI/CD)
AGENT_POLICY_STRICT=true
AGENT_ALLOW_DEPRECATED=false

# Approval tokens
AGENT_APPROVAL_TOKEN=eyJ...

# Audit configuration
AGENT_AUDIT_WEBHOOK=https://audit.example.com/log
AGENT_AUDIT_LEVEL=verbose
```

---

## 6. Security Considerations

### 6.1 Authentication

```typescript
interface AuthConfig {
  // API Key authentication
  apiKey?: {
    header: string;               // Header name
    value: string;                // Key value or env reference
  };

  // OAuth2 authentication
  oauth2?: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
  };

  // Mutual TLS
  mtls?: {
    cert: string;                 // Path to client certificate
    key: string;                  // Path to private key
    ca: string;                   // Path to CA bundle
  };
}
```

### 6.2 Signature Verification

```typescript
interface SignatureConfig {
  // Verify server signatures
  verifyServerSignatures: boolean;

  // Trusted publishers
  trustedPublishers: string[];

  // Public keys for verification
  publicKeys: {
    [publisherId: string]: string;  // PEM-encoded public key
  };

  // Key rotation
  allowExpiredKeys: boolean;
  keyRotationGracePeriod: number;   // Hours
}
```

### 6.3 Secret Management

```yaml
# Integration with secret managers
secrets:
  provider: vault  # vault | aws-secrets | azure-keyvault | gcp-secrets
  config:
    address: https://vault.example.com
    path: secret/data/agent-resolver
    role: agent-resolver-role
```

---

## 7. Deployment Architecture

### 7.1 Standalone Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                      Developer Workstation                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │  agents.md  │────▶│   Agent     │────▶│ agents.lock │      │
│   │             │     │  Resolver   │     │             │      │
│   └─────────────┘     └──────┬──────┘     └─────────────┘      │
│                              │                                  │
│                              ▼                                  │
│                     ┌─────────────┐                             │
│                     │   Registry  │◀──── Cached/Synced          │
│                     │    Cache    │                             │
│                     └─────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Enterprise Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                        Enterprise Network                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │                   Registry Service                    │     │
│   ├──────────────────────────────────────────────────────┤     │
│   │                                                      │     │
│   │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │     │
│   │  │    MCP     │  │   Agent    │  │   Policy   │     │     │
│   │  │  Registry  │  │  Registry  │  │  Registry  │     │     │
│   │  └────────────┘  └────────────┘  └────────────┘     │     │
│   │         │               │               │            │     │
│   │         └───────────────┴───────────────┘            │     │
│   │                         │                            │     │
│   │                    ┌────┴────┐                       │     │
│   │                    │   API   │                       │     │
│   │                    │ Gateway │                       │     │
│   │                    └────┬────┘                       │     │
│   │                         │                            │     │
│   └─────────────────────────┼────────────────────────────┘     │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐              │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐        │
│   │   Dev    │        │    CI    │        │  Prod    │        │
│   │Workstation│       │ Pipeline │        │ Runtime  │        │
│   └──────────┘        └──────────┘        └──────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Migration Path

### Phase 1: Local Policies (Current + Policies)
- Add local policy file support
- Implement policy merge logic
- Add `agent policy check` command

### Phase 2: Registry Integration
- Add registry client
- Implement caching layer
- Add `agent registry` commands

### Phase 3: Hooks System
- Implement hook lifecycle
- Add webhook and script handlers
- Add built-in hooks for common patterns

### Phase 4: Enterprise Features
- Add approval workflows
- Implement audit logging
- Add signature verification

---

## 9. API Reference

### 9.1 Registry API

```
GET  /api/v1/mcp/servers              # List all servers
GET  /api/v1/mcp/servers/:id          # Get server by ID
GET  /api/v1/mcp/servers/:id/versions # List server versions
GET  /api/v1/agents                   # List all agents
GET  /api/v1/agents/:id               # Get agent by ID
GET  /api/v1/policies                 # List all policies
GET  /api/v1/policies/:id             # Get policy by ID
POST /api/v1/approvals                # Request approval
GET  /api/v1/approvals/:id            # Check approval status
POST /api/v1/audit/log                # Log resolution event
```

### 9.2 Webhook Payloads

**Post-Resolve Hook:**

```json
{
  "event": "post-resolve",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "agent": {
    "name": "my-agent",
    "version": "1.0.0"
  },
  "resolution": {
    "success": true,
    "servers": [...],
    "policiesApplied": [...],
    "effectiveConstraints": {...}
  },
  "environment": {
    "user": "developer@example.com",
    "machine": "dev-workstation-1",
    "ci": false
  }
}
```

---

## 10. Benefits Summary

| Feature | Benefit |
|---------|---------|
| **Private Registry** | Centralized control over available servers |
| **Policy Framework** | Enforce org-wide security and compliance |
| **Hooks System** | Integrate with existing tooling and workflows |
| **Approval Workflows** | Governance for sensitive configurations |
| **Audit Logging** | Complete trail for compliance |
| **Offline Support** | Work without network via cached registries |
| **Signature Verification** | Cryptographic trust chain |
| **Multi-tenancy** | Policies scoped to teams/projects |
