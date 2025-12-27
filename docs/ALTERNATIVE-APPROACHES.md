# Alternative Approaches for Enterprise Extensions

## The Core Question

Instead of building custom registries and policy engines from scratch, we can leverage existing infrastructure that organizations already have.

---

## Approach 1: GitOps-Based (Recommended)

**Use Git repositories as the source of truth for everything.**

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitOps Architecture                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   org-mcp-registry/              (Git repo)                     │
│   ├── servers/                                                  │
│   │   ├── acme-audiences.json                                   │
│   │   └── acme-reporting.json                                   │
│   ├── policies/                                                 │
│   │   ├── org-baseline.json                                     │
│   │   └── hipaa-compliance.json                                 │
│   └── index.json                 (auto-generated)               │
│                                                                 │
│   team-config/                   (Git repo)                     │
│   ├── agents.md                                                 │
│   ├── team-policy.json                                          │
│   └── agents.lock                (committed!)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

**1. Registry = Git Repository**

```bash
# .agentrc.json
{
  "registries": [
    {
      "name": "org-mcp",
      "type": "git",
      "url": "git@github.com:myorg/mcp-registry.git",
      "branch": "main",
      "path": "servers/"
    }
  ]
}
```

```bash
# Sync is just git pull
agent registry sync
# Equivalent to:
git clone --depth 1 git@github.com:myorg/mcp-registry.git .agent-cache/org-mcp
```

**2. Policies = Git Repository + Branch Protection**

```yaml
# org-mcp-registry/.github/CODEOWNERS
/policies/  @security-team
/servers/   @platform-team
```

```yaml
# Branch protection = Approval workflow
# No custom approval system needed!
```

**3. Governance = Pull Requests**

```bash
# Adding a new server? Submit a PR.
# Changing a policy? Submit a PR.
# All changes are audited via git history.
# Approvals are handled by GitHub/GitLab.
```

### Benefits

| Aspect | Custom Registry | GitOps |
|--------|-----------------|--------|
| Audit trail | Build it | Git history (free) |
| Approvals | Build it | PR reviews (free) |
| Versioning | Build it | Git tags (free) |
| Rollback | Build it | `git revert` (free) |
| Offline | Build caching | `git clone` (free) |
| Auth | Build it | SSH keys / tokens (existing) |
| Search | Build it | GitHub search (free) |

### New CLI Commands (Simplified)

```bash
# Sync all registries
agent sync

# Resolve using synced registries
agent resolve

# That's it. No registry service to deploy.
```

---

## Approach 2: Open Policy Agent (OPA) Integration

**Use OPA for policy evaluation instead of custom policy engine.**

```
┌─────────────────────────────────────────────────────────────────┐
│                      OPA Integration                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │  agents.md  │────▶│   Agent     │────▶│     OPA     │      │
│   │             │     │  Resolver   │     │   Policy    │      │
│   └─────────────┘     └──────┬──────┘     │   Engine    │      │
│                              │            └──────┬──────┘      │
│                              │                   │              │
│                              ▼                   ▼              │
│                         Resolution          Allow/Deny          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Policies in Rego (OPA's Language)

```rego
# policies/security.rego
package agent.security

default allow = false

# Allow if all servers are signed
allow {
    every server in input.selectedServers {
        server.trust.signed == true
    }
}

# Deny if PII sensitivity without approval
deny[msg] {
    input.agent.constraints.data.sensitivity in ["pii.low", "pii.moderate", "pii.high"]
    not has_approval("security-team")
    msg := "PII handling requires security team approval"
}

# Deny deprecated servers
deny[msg] {
    some server in input.selectedServers
    server.status == "deprecated"
    msg := sprintf("Server %s is deprecated", [server.id])
}
```

### Integration

```typescript
// packages/core/src/policy.ts
import { exec } from 'child_process';

export async function evaluatePolicy(
  resolution: ResolveOutput,
  policyPath: string
): Promise<PolicyResult> {
  const input = JSON.stringify({
    agent: resolution.agent,
    selectedServers: resolution.lockfile.servers,
    constraints: resolution.effectiveConstraints
  });

  // Call OPA
  const result = await exec(`opa eval -d ${policyPath} -i - "data.agent"`);
  return JSON.parse(result);
}
```

### Benefits

- **Battle-tested**: OPA is used by Kubernetes, Envoy, Terraform
- **Expressive**: Rego is purpose-built for policy
- **Ecosystem**: Existing policies, testing tools, IDE support
- **Decoupled**: Policies managed separately from resolver

---

## Approach 3: NPM/Package Manager Distribution

**Distribute MCP server definitions as npm packages.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    NPM-Based Distribution                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   @myorg/mcp-audiences          (npm package)                   │
│   ├── package.json                                              │
│   │   └── "mcp": { server definition }                          │
│   └── README.md                                                 │
│                                                                 │
│   @myorg/mcp-reporting          (npm package)                   │
│   ├── package.json                                              │
│   │   └── "mcp": { server definition }                          │
│   └── README.md                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### package.json with MCP Metadata

```json
{
  "name": "@myorg/mcp-audiences",
  "version": "2.1.0",
  "mcp": {
    "id": "acme-audiences",
    "endpoint": "https://mcp.acme.com/audiences",
    "categories": ["audiences"],
    "scopes": ["read:audiences", "write:audiences"],
    "data": {
      "residency": ["us-only", "eu-only"],
      "maxSensitivity": "confidential"
    },
    "trust": {
      "signed": true,
      "publisher": "Acme Corp"
    }
  }
}
```

### agents.md with npm Dependencies

```yaml
---
name: my-agent
version: 1.0.0
requires:
  mcp:
    - package: "@myorg/mcp-audiences"
      version: "^2.0.0"
      permissions:
        - read:audiences
        - write:audiences
---
```

### Resolution

```bash
# Install MCP packages
npm install @myorg/mcp-audiences @myorg/mcp-reporting

# Resolve reads from node_modules
agent resolve
```

### Benefits

- **Existing infrastructure**: npm registry, verdaccio for private
- **Version ranges**: Semver support built-in
- **Lockfiles**: package-lock.json already exists
- **Caching**: npm cache just works
- **Private registries**: npm/yarn/pnpm all support private

---

## Approach 4: Simple File-Based Federation

**Just merge multiple index files. No services needed.**

```
┌─────────────────────────────────────────────────────────────────┐
│                   File-Based Federation                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   /shared/mcp-registry/                                         │
│   ├── org-servers.json          (org-wide servers)              │
│   ├── team-servers.json         (team additions)                │
│   └── org-policy.json           (org policies)                  │
│                                                                 │
│   /project/                                                     │
│   ├── agents.md                                                 │
│   ├── local-servers.json        (dev/test servers)              │
│   ├── team-policy.json          (team overrides)                │
│   └── agents.lock                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration

```json
// .agentrc.json
{
  "indexes": [
    "/shared/mcp-registry/org-servers.json",
    "/shared/mcp-registry/team-servers.json",
    "./local-servers.json"
  ],
  "policies": [
    "/shared/mcp-registry/org-policy.json",
    "./team-policy.json"
  ]
}
```

### Resolution

```bash
# Merge all indexes, apply all policies, resolve
agent resolve

# The resolver just reads multiple files and merges them
# Servers: union of all indexes
# Policies: applied in order (later = stricter)
```

### Implementation (Trivial)

```typescript
// packages/core/src/federation.ts
export function mergeIndexes(paths: string[]): McpIndex {
  const servers: McpServer[] = [];
  const seen = new Set<string>();

  for (const path of paths) {
    const index = JSON.parse(fs.readFileSync(path, 'utf-8'));
    for (const server of index) {
      const key = `${server.id}@${server.version}`;
      if (!seen.has(key)) {
        servers.push(server);
        seen.add(key);
      }
    }
  }

  return servers;
}
```

### Benefits

- **Zero infrastructure**: Just files
- **Works with any file sync**: Dropbox, S3, NFS, git
- **Trivial to implement**: ~50 lines of code
- **Easy to understand**: No magic

---

## Approach 5: Kubernetes-Native (For K8s Users)

**Use ConfigMaps and CRDs for everything.**

```yaml
# MCP Server as ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-acme-audiences
  namespace: mcp-registry
  labels:
    mcp.io/type: server
    mcp.io/category: audiences
data:
  server.json: |
    {
      "id": "acme-audiences",
      "version": "2.1.0",
      ...
    }
```

```yaml
# Policy as CRD
apiVersion: mcp.io/v1
kind: McpPolicy
metadata:
  name: org-security-baseline
spec:
  scope:
    namespaces: ["*"]
  rules:
    - type: require-signed
      severity: error
```

### Benefits

- **Native to K8s**: If you're already on K8s
- **RBAC**: Kubernetes RBAC for access control
- **GitOps**: ArgoCD/Flux for deployment
- **Audit**: Kubernetes audit logs

---

## Recommended Approach: Hybrid GitOps + Simple Policies

**Combine the simplest parts of each approach:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 Recommended Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. REGISTRY: Git repository (GitOps)                          │
│      └── Changes via PRs, approvals via code review             │
│                                                                 │
│   2. POLICIES: Simple JSON files in same repo                   │
│      └── Evaluated locally, no OPA needed for MVP               │
│                                                                 │
│   3. HOOKS: Just git hooks + CI/CD                              │
│      └── pre-commit, GitHub Actions, etc.                       │
│                                                                 │
│   4. AUDIT: Git history + optional webhook on resolve           │
│      └── `agent resolve` can POST to audit endpoint             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Effort

| Feature | Custom (EXTENSION-SPEC) | GitOps Hybrid |
|---------|-------------------------|---------------|
| Registry | Build service, API, DB | Git repo ✓ |
| Caching | Build caching layer | `git clone` ✓ |
| Versioning | Build version tracking | Git tags ✓ |
| Approvals | Build workflow engine | PR reviews ✓ |
| Audit | Build audit service | Git history ✓ |
| Policies | Build policy engine | JSON merge ✓ |
| Auth | Build auth system | Git SSH/tokens ✓ |
| **Total effort** | 3-6 months | 1-2 weeks |

---

## Updated CLI Design

```bash
# Configuration
agent config init                     # Create .agentrc.json
agent config set registry.git "git@github.com:myorg/mcp-registry.git"

# Sync (git-based)
agent sync                            # git pull all registries
agent sync --offline                  # Use cached only

# Resolve (with policy merge)
agent resolve                         # Apply policies automatically
agent resolve --dry-run               # Show what would happen
agent resolve --policy-report         # Detailed policy evaluation

# Audit (optional webhook)
agent resolve --audit-webhook https://audit.example.com/log
```

### .agentrc.json (Simplified)

```json
{
  "registries": [
    {
      "name": "org",
      "git": "git@github.com:myorg/mcp-registry.git",
      "path": "servers/"
    }
  ],
  "policies": [
    "git://org/policies/baseline.json",
    "./team-policy.json"
  ],
  "audit": {
    "webhook": "https://audit.example.com/log"
  }
}
```

---

## Summary: What to Build

### Phase 1 (Now): File-Based Federation
```typescript
// Add to packages/core
function mergeIndexes(paths: string[]): McpIndex;
function mergePolicies(paths: string[]): EffectivePolicy;
function applyPolicy(resolution: ResolveOutput, policy: Policy): PolicyResult;
```

### Phase 2 (Next): Git Registry Support
```typescript
// Add to packages/cli
function syncGitRegistry(config: GitRegistryConfig): void;
function getCachedIndex(name: string): McpIndex;
```

### Phase 3 (Optional): Audit Webhook
```typescript
// Add to packages/cli
function postAuditLog(webhook: string, resolution: ResolveOutput): void;
```

**Everything else (approvals, versioning, rollback, auth) comes free from Git.**

---

## Conclusion

The original EXTENSION-SPEC.md describes a comprehensive but complex system. For most organizations, a simpler approach works better:

1. **Use Git for registries** — You already have it
2. **Use PRs for approvals** — You already do this
3. **Use JSON files for policies** — Simple and auditable
4. **Use git history for audit** — Complete and immutable
5. **Add a webhook for real-time audit** — Optional, 20 lines of code

This reduces months of development to weeks, uses familiar tools, and achieves the same governance goals.
