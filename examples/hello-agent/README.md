# Hello Agent Example

This example demonstrates the Agent Resolver CLI.

## Files

- `agents.md` - Agent definition with requirements and constraints
- `mcp.index.json` - Local MCP server index
- `reference/` - Reference outputs for verification

## Usage

From the repository root:

```bash
# Install dependencies and build
npm install
npm run build

# Run commands in the example directory
cd examples/hello-agent

# Validate the configuration
node ../../packages/cli/dist/index.js validate

# Discover available servers
node ../../packages/cli/dist/index.js discover

# Resolve and generate lockfile
node ../../packages/cli/dist/index.js resolve

# Resolve with explanation output
node ../../packages/cli/dist/index.js resolve --explain
```

## Expected Output

After running `agent resolve`, you should see:
- `agents.lock` - The lockfile with selected servers
- `agents.resolution.json` - (with --explain) Detailed resolution explanation

## Reference Implementation

The `reference/` directory contains expected outputs (with `TIMESTAMP` placeholder for `resolvedAt`):

- `reference/agents.lock` - Expected lockfile structure
- `reference/agents.resolution.json` - Expected resolution explanation

### Verifying Determinism

To verify your output matches the reference:

```bash
# Generate outputs
node ../../packages/cli/dist/index.js resolve --explain

# Compare (excluding timestamp)
jq 'del(.resolvedAt)' agents.lock > /tmp/actual.json
jq 'del(.resolvedAt)' reference/agents.lock > /tmp/expected.json
diff /tmp/actual.json /tmp/expected.json && echo "✓ Lockfile matches reference"
```

### Expected Hashes

The deterministic hashes for the selected servers are:

| Server | Hash |
|--------|------|
| acme-audiences@2.1.0 | `a5cdac3f506074eb4b3fcfa82d590b88c6fa2a0e7d804efe2bbf82dcb7dc8816` |
| acme-reporting@3.0.0 | `8c083ef9140aeff3feae1b5d22cafb17c54ed2e4ebff317b13723f65f27ddaf8` |

## Resolution Logic

Given the constraints:
- **Sensitivity**: `internal`
- **Residency**: `us-only`

The resolver will:

1. **Audiences category**:
   - `acme-audiences` ✓ (signed, supports us-only, max sensitivity: confidential)
   - `beta-audiences` ✗ (unsigned, lower priority in tie-break)

2. **Reporting category**:
   - `acme-reporting` ✓ (signed, supports us-only, max sensitivity: pii.low)
   - `gamma-reporting` ✗ (eu-only residency mismatch)

## Rejection Reason Codes

The resolution explanation includes these reason codes:

| Code | Description |
|------|-------------|
| `MISSING_CATEGORY` | Server doesn't support the required category |
| `MISSING_SCOPE` | Server doesn't provide all required permission scopes |
| `RESIDENCY_MISMATCH` | Server residency incompatible with agent constraints |
| `SENSITIVITY_EXCEEDED` | Agent sensitivity exceeds server's maxSensitivity |
