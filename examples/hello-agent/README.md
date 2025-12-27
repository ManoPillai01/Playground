# Hello Agent Example

This example demonstrates the Agent Resolver CLI.

## Files

- `agents.md` - Agent definition with requirements and constraints
- `mcp.index.json` - Local MCP server index

## Usage

From the repository root:

```bash
# Install dependencies and build
npm install
npm run build

# Run commands in the example directory
cd examples/hello-agent

# Validate the configuration
npx agent validate

# Discover available servers
npx agent discover

# Resolve and generate lockfile
npx agent resolve

# Resolve with explanation output
npx agent resolve --explain
```

## Expected Output

After running `agent resolve`, you should see:
- `agents.lock` - The lockfile with selected servers
- `agents.resolution.json` - (with --explain) Detailed resolution explanation

### Resolution Logic

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
