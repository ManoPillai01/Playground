# AdCP/MCP Router Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AdCP](https://img.shields.io/badge/AdCP-v2.5.0-blue)](https://adcontextprotocol.org/)
[![MCP](https://img.shields.io/badge/MCP-v1.0.0-green)](https://modelcontextprotocol.io/)

**Intelligent protocol routing for the dual-protocol advertising era.**

A reference implementation demonstrating deterministic routing between **AdCP (Ad Context Protocol)** and **MCP (Model Context Protocol)** based on advertising platform capabilities, workflow requirements, and governance constraints.

## What Is This?

This repository contains a complete specification and reference implementation for an AI agent that automatically selects between two competing advertising protocol standards:

- **AdCP (Ad Context Protocol)**: Purpose-built for advertising workflows (signals activation, programmatic buying, creative management)
- **MCP (Model Context Protocol)**: General-purpose protocol adopted by Google Ads, Google Analytics, and AppsFlyer

Instead of forcing a choice between protocols, this router intelligently uses both based on the task at hand.

## Why Does This Matter?

In 2025, the advertising industry fragmented into two protocol families:

| Date | Event |
|------|-------|
| **Jul 17, 2025** | AppsFlyer launches MCP server |
| **Jul 22, 2025** | Google Analytics launches MCP server |
| **Oct 7, 2025** | Google Ads launches MCP server |
| **Oct 15, 2025** | AdCP consortium launches (Yahoo, PubMatic, Scope3, 20+ companies) |

Advertisers now need agents that can work with **both** protocols. This router demonstrates how to do that deterministically.

## Platform Support

### AdCP Platforms (v2.5.0) - 9 Platforms

| Platform | Modules | Status |
|----------|---------|--------|
| **Scope3** | Signals Activation | ✅ Full support |
| **Yahoo** | Signals + Media Buy | ✅ Full support |
| **PubMatic** | Media Buy | ✅ Full support |
| **Optable** | Signals (Data Clean Room) | ✅ Full support |
| **Swivel** | Media Buy + Planning | ✅ Full support |
| **Triton Digital** | Creative (Audio) | ✅ Full support |
| **Magnite** | Creative (CTV) | 🟡 Launch member |
| **Samba TV** | Signals (CTV) | 🟡 Launch member |
| **Weather Company** | Signals (Contextual) | 🟡 Launch member |

### MCP Platforms (v1.0.0) - 3 Platforms

| Platform | Categories | Released |
|----------|-----------|----------|
| **Google Ads** | Campaigns, Analytics | Oct 7, 2025 |
| **Google Analytics** | Analytics, Reporting | Jul 22, 2025 |
| **AppsFlyer** | Attribution, Analytics | Jul 17, 2025 |

**Total**: 12 production advertising platforms across 20+ categories

## How It Works

### Routing Logic

The router applies deterministic protocol preferences:

**AdCP-First Categories:**
- **ad-signals**: Native Signals Activation Protocol
- **ad-media-buy**: Purpose-built programmatic buying
- **ad-creative**: Advertising-specific creative workflows

**MCP-First Categories:**
- **ad-analytics**: Mature read-only APIs (Google Analytics, AppsFlyer)

### Resolution Example

For an agent requiring 4 capabilities:

```
Requirements:
  ├─ ad-signals (read:audiences, write:audiences, activate:signals)
  ├─ ad-media-buy (read:products, create:media-buy, read:delivery)
  ├─ ad-analytics (read:reports, read:metrics, read:campaigns)
  └─ ad-creative (read:creatives, write:creatives)

Resolution:
  ✓ ad-signals     → Optable AdCP       (native signals protocol)
  ✓ ad-media-buy   → PubMatic AdCP      (programmatic buying)
  ✓ ad-analytics   → AppsFlyer MCP      (mature attribution API)
  ✓ ad-creative    → Magnite AdCP       (CTV creative management)
```

### Constraint Enforcement

The router enforces hard constraints:

- **Data Residency**: US-only, EU-only, or global
- **Sensitivity Levels**: public → internal → confidential → pii.low → pii.moderate → pii.high
- **Permission Scopes**: Servers must support all required scopes
- **Trust Requirements**: Cryptographic signing validation

If constraints can't be satisfied, the router fails with actionable error messages.

## Repository Contents

### Core Files

- **`agents.md`** - Agent requirements and constraints (YAML frontmatter + markdown)
- **`mcp.index.json`** - Server registry with 12 production platforms
- **`routing-policy.json`** - Protocol preference policies
- **`agents.lock`** - Generated lockfile with SHA-256 hashes (example output)
- **`agents.resolution.json`** - Complete audit trail (example output)

### Documentation

- **`README.md`** - This file (overview and usage)
- **`SUMMARY.md`** - Research summary and findings
- **`BLOG.md`** - Comprehensive technical article (~4,000 words)
- **`LINKEDIN_POST.md`** - 5 LinkedIn post variants for different audiences

## Quick Start

### View the Specification

```bash
# Clone the repository
git clone https://github.com/ManoPillai01/ADCP-MCP-Router.git
cd ADCP-MCP-Router

# View agent requirements
cat agents.md

# View platform registry
cat mcp.index.json

# View resolution results
cat agents.lock
cat agents.resolution.json
```

### Running the Router

This repository contains the specification and reference data. To actually run the resolution engine, you need the [Agent Resolver CLI](https://github.com/ManoPillai01/Playground):

```bash
# Clone the Agent Resolver
git clone https://github.com/ManoPillai01/Playground.git
cd Playground

# Install and build
npm install
npm run build

# Run resolution on this example
npm run agent -- resolve \
  -a ../ADCP-MCP-Router/agents.md \
  -i ../ADCP-MCP-Router/mcp.index.json \
  --explain
```

## Example Resolutions

### Actual Resolution Results

Running the router produces:

**Selected Servers:**
- **ad-signals**: Optable AdCP (v2.5.0) - Selected via alphabetical tie-break
- **ad-media-buy**: PubMatic AdCP (v2.5.0) - Yahoo lost tie-break, Google Ads missing scope
- **ad-analytics**: AppsFlyer MCP (v1.0.0) - Mature mobile attribution
- **ad-creative**: Magnite AdCP (v2.5.0) - Only matching candidate after constraint filtering

**Rejected Examples:**
- Google Ads (media-buy): Missing `read:products` scope
- Triton Digital (creative): Sensitivity exceeded (agent: confidential, server: internal)
- Swivel (media-buy): Sensitivity exceeded
- Weather Company (signals): Missing `write:audiences` scope

Complete rejection reasons in `agents.resolution.json`.

## Testing Scenarios

### Scenario 1: EU-Only Residency

Edit `agents.md`:
```yaml
constraints:
  data:
    residency: eu-only
```

**Effect**: Eliminates US-only servers (Swivel, Samba TV, Weather Company)

### Scenario 2: Strict Sensitivity

Edit `agents.md`:
```yaml
constraints:
  data:
    sensitivity: public
```

**Effect**: Fails resolution (no servers support public-only data)

### Scenario 3: MCP-Only Mode

Edit `agents.md`:
```yaml
constraints:
  actions:
    forbid:
      - activate:signals  # AdCP-specific scope
```

**Effect**: Forces fallback to MCP servers only

## Key Insights

### 1. Protocol Coexistence Is Reality

AdCP and MCP will both survive:
- **AdCP** excels at advertising-specific workflows
- **MCP** excels at general-purpose platform integrations

Smart agents use both.

### 2. Determinism Enables Trust

Same inputs always produce identical outputs:
- Reproducible for compliance audits
- Explainable with reason codes
- Stable across environments
- No LLM reasoning in core logic

### 3. Governance As Code

Constraints are first-class configuration:
```yaml
constraints:
  data:
    sensitivity: confidential
    residency: eu-only
  actions:
    forbid: [delete:campaigns, write:billing]
```

This enables GitOps workflows for advertising operations.

### 4. The Death of Manual Integration

Adding new platforms requires only configuration changes:
```json
{
  "id": "new-platform-adcp",
  "version": "2.5.0",
  "categories": ["ad-signals"],
  "protocol": "adcp"
}
```

No code changes. No redeployment. Just update the index.

## Industry Context

### AdCP Launch (October 15, 2025)

A consortium of 20+ companies launched AdCP as "OpenRTB for the AI era":
- Built on Anthropic's Model Context Protocol
- Standardizes agent-to-agent advertising workflows
- Open source: [github.com/adcontextprotocol/adcp](https://github.com/adcontextprotocol/adcp)

**Founding Members**: Yahoo, PubMatic, Scope3, Optable, Swivel, Triton Digital

**Launch Members**: Magnite, Samba TV, Weather Company, LG Ad Solutions, AccuWeather

### MCP Adoption (2025)

Major platforms adopted MCP for advertising integrations:
- **Google Ads** (Oct 7): [Open-source MCP server](https://github.com/google-marketing-solutions/google_ads_mcp)
- **Google Analytics** (Jul 22): Read-only analytics access
- **AppsFlyer** (Jul 17): Mobile attribution and measurement

### The Convergence

By late 2025, advertisers need agents that can:
1. Use AdCP for cutting-edge advertising workflows
2. Use MCP for established platform APIs
3. Route intelligently based on task requirements
4. Maintain audit trails for compliance

This router demonstrates how.

## Documentation

- **[Blog Post](BLOG.md)**: Comprehensive technical deep dive (~4,000 words)
- **[Research Summary](SUMMARY.md)**: Platform analysis and resolution examples
- **[LinkedIn Posts](LINKEDIN_POST.md)**: 5 social media variants for different audiences
- **[Routing Policy](routing-policy.json)**: Protocol preference configuration

## Further Reading

### AdCP Resources
- [AdCP Official Site](https://adcontextprotocol.org/)
- [AdCP GitHub](https://github.com/adcontextprotocol/adcp)
- [Industry Coalition Launch](https://www.samba.tv/press-releases/industry-coalition-launches-ad-context-protocol-adcp-open-standard-for-agentic-advertising-infrastructure)

### Analysis & Commentary
- [Shelly Palmer: AdCP Analysis](https://shellypalmer.com/2025/10/adcp-ad-context-protocol-a-real-attempt-to-make-agents-buy-media/)
- [ExchangeWire: Industry Perspective](https://www.exchangewire.com/blog/2025/10/23/what-the-ad-tech-industry-makes-of-the-adcp-agentic-ai-standard/)
- [VideoWeek: Agent-to-Agent Trading](https://videoweek.com/2025/10/15/industry-coalition-ushers-in-age-of-agent-to-agent-trading-with-ad-context-protocol-launch/)

### MCP Platform Documentation
- [Google Ads MCP Server](https://github.com/google-marketing-solutions/google_ads_mcp)
- [Google Analytics MCP](https://developers.google.com/analytics/devguides/MCP)
- [AppsFlyer MCP](https://www.appsflyer.com/blog/measurement-analytics/appsflyer-mcp-ai/)

## Contributing

Contributions welcome! Areas of interest:
- Additional platform definitions
- New constraint types
- Resolution algorithm improvements
- Documentation enhancements

Please open an issue or pull request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with research from:
- AdCP consortium and founding members
- Google's MCP implementations
- AppsFlyer's mobile attribution platform
- Industry analysts and commentators

Special thanks to the open-source community building the infrastructure for agentic advertising.

---

**Created**: December 28, 2025
**AdCP Version**: 2.5.0
**MCP Version**: 1.0.0
**Platforms**: 12 production servers across 20+ categories

For questions or discussion, open an issue or connect on LinkedIn.
