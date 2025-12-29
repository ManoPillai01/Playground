# AdCP/MCP Router Agent

A demonstration of intelligent protocol routing between **AdCP (Ad Context Protocol)** and **MCP (Model Context Protocol)** based on advertising platform capabilities.

## Overview

This example shows how the Agent Resolver can deterministically select between two related but distinct protocols:

- **AdCP (Ad Context Protocol)**: Built on MCP, specifically designed for advertising workflows (signals, media buying, creative management)
- **MCP (Model Context Protocol)**: General-purpose protocol for AI model context, implemented by major ad platforms like Google Ads and Google Analytics

## The Problem

In 2025, the advertising industry has two protocol standards:

1. **AdCP** (launched Oct 15, 2025): An open standard from a consortium of 20+ companies (Yahoo, PubMatic, Scope3, etc.) designed specifically for agentic advertising workflows
2. **MCP** (existing): Anthropic's Model Context Protocol, adopted by Google Ads (Oct 2025), Google Analytics (Jul 2025), and AppsFlyer (Jul 2025)

AI agents managing advertising workflows need to communicate with both:
- AdCP servers for advanced advertising features (signals activation, programmatic buying)
- MCP servers for established platforms (Google Ads API, Google Analytics)

## The Solution: Protocol-Aware Routing

This agent demonstrates **deterministic protocol selection** based on:

1. **Workflow type**: Different advertising tasks prefer different protocols
2. **Platform capabilities**: What each platform actually supports
3. **Maturity**: AdCP for new workflows, MCP for established APIs
4. **Constraints**: Data residency, sensitivity, trust requirements

## Platform Support Matrix

### AdCP-Enabled Platforms (Advertising-Native)

| Platform | Categories | Launch Status | Use Case |
|----------|-----------|---------------|----------|
| **Scope3** | Signals, Sustainability | Full support | Carbon-aware audience activation |
| **Yahoo** | Signals, Media Buy, DSP | Full support | End-to-end programmatic campaigns |
| **PubMatic** | Media Buy, SSP | Full support | Supply-side programmatic |
| **Optable** | Signals, Data Clean Room | Full support | Privacy-safe audience activation |
| **Swivel** | Media Buy, Planning | Full support | Media planning automation |
| **Triton Digital** | Creative, Audio | Full support | Audio/streaming ad creative |
| **Magnite** | Creative, SSP, CTV | Launch member | CTV creative management |
| **Samba TV** | Signals, CTV | Launch member | CTV audience signals |
| **The Weather Company** | Signals, Contextual | Launch member | Weather-contextual targeting |

### MCP-Enabled Platforms (General-Purpose)

| Platform | Categories | Release Date | Use Case |
|----------|-----------|--------------|----------|
| **Google Ads** | Campaigns, Analytics | Oct 7, 2025 | Search/display campaign management |
| **Google Analytics** | Analytics, Reporting | Jul 22, 2025 | Performance measurement (read-only) |
| **AppsFlyer** | Attribution, Analytics | Jul 17, 2025 | Mobile attribution and analytics |

## Routing Logic

The agent uses deterministic selection rules:

### 1. Ad Signals (AdCP-first)
```
Preference: AdCP Signals Activation > MCP audiences
Reason: AdCP designed for this workflow
Selected: scope3-adcp (full signals protocol support)
```

### 2. Media Buying (AdCP-first)
```
Preference: AdCP Media Buy Protocol > MCP campaigns
Reason: Native programmatic buying support
Selected: yahoo-adcp (signals + media-buy modules)
```

### 3. Analytics (MCP-first)
```
Preference: MCP analytics > AdCP reporting
Reason: Mature, read-only APIs; no write risk
Selected: google-analytics-mcp (established since Jul 2025)
```

### 4. Creative Management (AdCP-first)
```
Preference: AdCP Creative Protocol > MCP assets
Reason: Advertising-specific creative workflows
Selected: triton-digital-adcp (audio/streaming creative)
```

## Running the Example

### 1. Validate Configuration

```bash
cd examples/adcp-router-agent
npx agent validate
```

Expected output:
```
✓ agents.md frontmatter valid
✓ mcp.index.json valid (12 servers)
```

### 2. Discover Available Servers

```bash
npx agent discover
```

Expected output:
```
Available MCP Servers by Category:

ad-signals (5 servers):
  - scope3-adcp v2.5.0 [AdCP] (signed by Scope3 Inc)
  - yahoo-adcp v2.5.0 [AdCP] (signed by Yahoo Inc)
  - optable-adcp v2.5.0 [AdCP] (signed by Optable Technologies Inc)
  - samba-tv-adcp v2.5.0 [AdCP] (signed by Samba TV Inc)
  - the-weather-company-adcp v2.5.0 [AdCP] (signed by The Weather Company)

ad-media-buy (5 servers):
  - yahoo-adcp v2.5.0 [AdCP] (signed by Yahoo Inc)
  - pubmatic-adcp v2.5.0 [AdCP] (signed by PubMatic Inc)
  - google-ads-mcp v1.0.0 [MCP] (signed by Google LLC)
  - swivel-adcp v2.5.0 [AdCP] (signed by Swivel Inc)

ad-analytics (3 servers):
  - google-ads-mcp v1.0.0 [MCP] (signed by Google LLC)
  - google-analytics-mcp v1.0.0 [MCP] (signed by Google LLC)
  - appsflyer-mcp v1.0.0 [MCP] (signed by AppsFlyer Ltd)

ad-creative (2 servers):
  - triton-digital-adcp v2.5.0 [AdCP] (signed by Triton Digital)
  - magnite-adcp v2.5.0 [AdCP] (signed by Magnite Inc)
```

### 3. Resolve with Explanation

```bash
npx agent resolve --explain
```

This generates two files:

#### `agents.lock` (deterministic lockfile)
```json
{
  "version": "1",
  "agent": {
    "name": "adcp-mcp-router",
    "version": "1.0.0"
  },
  "servers": [
    {
      "category": "ad-signals",
      "serverId": "scope3-adcp",
      "version": "2.5.0",
      "endpoint": "https://adcp.scope3.com/mcp",
      "scopes": ["read:audiences", "write:audiences", "activate:signals"],
      "hash": "sha256:..."
    },
    {
      "category": "ad-media-buy",
      "serverId": "google-ads-mcp",
      "version": "1.0.0",
      "endpoint": "stdio://google-ads-mcp",
      "scopes": ["read:products", "create:media-buy", "read:delivery"],
      "hash": "sha256:..."
    },
    {
      "category": "ad-analytics",
      "serverId": "google-analytics-mcp",
      "version": "1.0.0",
      "endpoint": "stdio://google-analytics-mcp",
      "scopes": ["read:reports", "read:metrics", "read:campaigns"],
      "hash": "sha256:..."
    },
    {
      "category": "ad-creative",
      "serverId": "magnite-adcp",
      "version": "2.5.0",
      "endpoint": "https://adcp.magnite.com/mcp",
      "scopes": ["read:creatives", "write:creatives"],
      "hash": "sha256:..."
    }
  ],
  "generated": "2025-12-28T10:30:00.000Z"
}
```

#### `agents.resolution.json` (explanation)
```json
{
  "requirements": [
    {
      "category": "ad-signals",
      "selected": {
        "serverId": "scope3-adcp",
        "version": "2.5.0",
        "reason": "PREFERRED_SIGNED"
      },
      "rejected": [
        {
          "serverId": "yahoo-adcp",
          "reason": "TIE_BREAK_ALPHABETICAL",
          "note": "Both signed; scope3-adcp selected alphabetically"
        },
        {
          "serverId": "optable-adcp",
          "reason": "TIE_BREAK_ALPHABETICAL"
        }
      ]
    }
  ]
}
```

## Key Insights

### 1. Protocol Coexistence
AdCP and MCP will coexist in the advertising ecosystem:
- **AdCP**: Purpose-built for advertising (signals, media buy, creative)
- **MCP**: General-purpose, adopted by tech giants (Google, Meta platforms)

### 2. Deterministic Selection Benefits
The resolver's deterministic approach ensures:
- **Reproducibility**: Same inputs → same lockfile
- **Auditability**: Every decision has a reason code
- **Safety**: Constraints prevent misconfiguration
- **Stability**: Lockfile changes only when inputs change

### 3. Real-World Complexity
This example demonstrates:
- **12 production advertising platforms** (as of Dec 2025)
- **Two protocol families** (AdCP 2.5.0, MCP 1.0.0)
- **Mixed capabilities** (some platforms support both)
- **Trust requirements** (all platforms are signed)

## Testing Different Scenarios

### Scenario 1: EU-Only Residency
Edit `agents.md`:
```yaml
constraints:
  data:
    residency: eu-only
```

Result: Eliminates US-only servers (Swivel, Samba TV, Weather Company)

### Scenario 2: Public Sensitivity Only
Edit `agents.md`:
```yaml
constraints:
  data:
    sensitivity: public
```

Result: Fails resolution (no servers support public-only data)

### Scenario 3: Forbid AdCP Protocols
Edit `agents.md`:
```yaml
constraints:
  actions:
    forbid:
      - activate:signals
```

Result: Falls back to MCP servers only

## Industry Context

### AdCP Launch (October 15, 2025)
An industry coalition launched AdCP as "OpenRTB for the AI era":
- **20+ founding members**: Yahoo, PubMatic, Scope3, Optable, Swivel, Triton Digital
- **Built on MCP**: Extends Anthropic's Model Context Protocol
- **Purpose**: Standardize agent-to-agent advertising workflows
- **Open source**: https://github.com/adcontextprotocol/adcp

### MCP Adoption in Advertising (2025)
Major platforms adopted MCP for AI integration:
- **Google Ads** (Oct 7, 2025): Full campaign management API
- **Google Analytics** (Jul 22, 2025): Read-only analytics access
- **AppsFlyer** (Jul 17, 2025): Mobile attribution and measurement

### The Convergence
By late 2025, advertisers need agents that can:
1. Use AdCP for cutting-edge advertising workflows
2. Use MCP for established platform APIs
3. Route intelligently based on task requirements
4. Maintain audit trails for compliance

This agent demonstrates how to handle that complexity deterministically.

## Further Reading

- [AdCP Official Site](https://adcontextprotocol.org/)
- [AdCP GitHub Repository](https://github.com/adcontextprotocol/adcp)
- [Google Ads MCP Server](https://github.com/google-marketing-solutions/google_ads_mcp)
- [Shelly Palmer: AdCP Analysis](https://shellypalmer.com/2025/10/adcp-ad-context-protocol-a-real-attempt-to-make-agents-buy-media/)
- [ExchangeWire: AdCP Industry Perspective](https://www.exchangewire.com/blog/2025/10/23/what-the-ad-tech-industry-makes-of-the-adcp-agentic-ai-standard/)

## License

This example is part of the Agent Resolver project (MIT License).
