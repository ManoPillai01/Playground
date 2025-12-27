# SPEC.md — Deterministic Agent Resolver (MVP)

## Goal
Build a CLI that treats `agents.md` as an input and produces a deterministic, auditable, safe toolchain selection from available MCP servers.

The MVP must:
- Parse a minimal subset of `agents.md` frontmatter
- Read available MCP server metadata from a local index file
- Deterministically filter incompatible servers
- Generate `agents.lock` pinning the selected servers and permission scopes
- Provide an explain output with accept/reject reasons

No model calls. No runtime tool execution.

---

## 1. Input Files

### 1.1 `agents.md`
Treat as an external ecosystem artifact. For MVP, support frontmatter fields:

Required frontmatter:
- `name`: string
- `version`: string
- `requires`:
  - `mcp`: array of requirements:
    - `category`: string (e.g., "audiences", "reporting")
    - `permissions`: string[] (scopes needed)
Optional frontmatter:
- `constraints`:
  - `data`:
    - `sensitivity`: string enum ["public","internal","confidential","pii.low","pii.moderate","pii.high"]
    - `residency`: string enum ["any","us-only","eu-only"]
  - `actions`:
    - `forbid`: string[] (action labels)

If required fields are missing, `agent validate` MUST fail with actionable messages.

---

### 1.2 `mcp.index.json` (Local MCP server index)
MVP discovery reads from a local file path:
- default: `./mcp.index.json`
- override via `--index <path>`

Schema (per server):
- `id`: string
- `version`: string
- `endpoint`: string
- `categories`: string[]
- `scopes`: string[]  (permission scopes the server supports)
- `data`:
  - `residency`: ["any","us-only","eu-only"]
  - `maxSensitivity`: same enum as above
- `trust`:
  - `signed`: boolean
  - `publisher`: string
- `policy`:
  - `rateLimitPerMin`: number (optional)

---

## 2. Deterministic Resolution Rules (No LLM)

### 2.1 Candidate selection per requirement
For each `requires.mcp[i]`:
- Candidate servers are those where:
  - requirement.category is in server.categories
  - requirement.permissions are subset of server.scopes

### 2.2 Constraint filtering (hard fails)
Eliminate candidates if:
- `constraints.data.residency` is incompatible with server.data.residency
  - "us-only" rejects "eu-only"
  - "eu-only" rejects "us-only"
  - "any" accepts all
- `constraints.data.sensitivity` exceeds server.data.maxSensitivity
- If `trust.requireSigned=true` is present (optional future), reject unsigned

If any required category has zero candidates after filtering: FAIL resolution.

### 2.3 Deterministic selection (tie-breaking)
If multiple candidates remain, select deterministically using:
1) prefer signed servers (`trust.signed=true`)
2) then lexicographic smallest `id`
3) then lexicographic smallest `version`

This makes selection deterministic without requiring ranking models.

---

## 3. Outputs

### 3.1 `agents.lock` (required)
A JSON lockfile pinned to:
- agent name/version
- selected MCP servers per requirement
- endpoint
- selected scopes (the required permissions)
- computed hash per selection:
  hash = sha256(id + "@" + version + "|" + endpoint + "|" + sorted_scopes.join(","))

The lockfile must be stable: keys and arrays sorted deterministically.

### 3.2 `agents.resolution.json` (only with --explain)
For each requirement:
- list selected server
- list rejected candidates with reason codes:
  - `MISSING_CATEGORY`
  - `MISSING_SCOPE`
  - `RESIDENCY_MISMATCH`
  - `SENSITIVITY_EXCEEDED`
  - `UNSIGNED_NOT_ALLOWED`
- include the exact constraint values used

---

## 4. CLI

### 4.1 `agent validate`
- validates `agents.md` frontmatter schema
- validates `mcp.index.json` schema if present
- exits non-zero on failure

### 4.2 `agent discover`
- prints available servers grouped by category
- source: local `mcp.index.json` only (MVP)

### 4.3 `agent resolve`
- performs resolution and writes `agents.lock`
- prints summary of selections
- fails non-zero if any required category cannot be satisfied

### 4.4 `agent resolve --explain`
- also writes `agents.resolution.json`

---

## 5. Acceptance Criteria
- Running in `examples/hello-agent` produces a lockfile
- Editing constraints causes deterministic, explainable failures
- Unit tests cover:
  - residency filtering
  - sensitivity filtering
  - scope subset matching
  - deterministic tie-break selection
  - stable lockfile output ordering
