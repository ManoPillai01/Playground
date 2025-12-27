---
name: hello-agent
version: 1.0.0
requires:
  mcp:
    - category: audiences
      permissions:
        - read:audiences
        - write:audiences
    - category: reporting
      permissions:
        - read:reports
constraints:
  data:
    sensitivity: internal
    residency: us-only
---

# Hello Agent

This is a simple example agent that demonstrates the Agent Resolver CLI.

## Requirements

This agent requires:
- **Audiences** MCP server with read/write permissions
- **Reporting** MCP server with read permissions

## Constraints

- Data sensitivity: internal
- Data residency: US only
