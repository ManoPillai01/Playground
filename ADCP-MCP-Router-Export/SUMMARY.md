# AdCP/MCP Router Agent - Research Summary

## Executive Summary

This example demonstrates an intelligent routing agent that deterministically selects between **AdCP (Ad Context Protocol)** and **MCP (Model Context Protocol)** servers based on advertising platform capabilities, workflow requirements, and data governance constraints.

## Key Findings

### 1. Protocol Landscape (December 2025)

**AdCP (Ad Context Protocol)**
- **Launch**: October 15, 2025
- **Consortium**: 20+ companies including Yahoo, PubMatic, Scope3, Optable, Swivel, Triton Digital
- **Foundation**: Built on Anthropic's Model Context Protocol (MCP)
- **Purpose**: Standardize agent-to-agent communication for advertising workflows
- **Version**: 2.5.0 (as of Dec 2025)
- **Modules**: Signals Activation, Media Buy, Creative, Curation (Q2 2025)

**MCP Adoption in Advertising**
- **Google Ads**: Oct 7, 2025 - Full API access via MCP
- **Google Analytics**: Jul 22, 2025 - Read-only analytics via MCP
- **AppsFlyer**: Jul 17, 2025 - Mobile attribution and analytics via MCP

### 2. Platform Support Matrix

| Platform | Protocol | Categories | Status |
|----------|----------|------------|--------|
| Scope3 | AdCP 2.5.0 | Signals, Sustainability | Full support |
| Yahoo | AdCP 2.5.0 | Signals, Media Buy, DSP | Full support |
| PubMatic | AdCP 2.5.0 | Media Buy, SSP | Full support |
| Optable | AdCP 2.5.0 | Signals, Data Clean Room | Full support |
| Swivel | AdCP 2.5.0 | Media Buy, Planning | Full support |
| Triton Digital | AdCP 2.5.0 | Creative, Audio | Full support |
| Magnite | AdCP 2.5.0 | Creative, SSP, CTV | Launch member |
| Samba TV | AdCP 2.5.0 | Signals, CTV | Launch member |
| Weather Company | AdCP 2.5.0 | Signals, Contextual | Launch member |
| Google Ads | MCP 1.0.0 | Campaigns, Analytics | Full support |
| Google Analytics | MCP 1.0.0 | Analytics, Reporting | Read-only |
| AppsFlyer | MCP 1.0.0 | Attribution, Analytics | Full support |

### 3. Routing Logic

The resolver implements deterministic protocol selection:

**AdCP-First Categories**:
- **ad-signals**: Purpose-built Signals Activation Protocol
- **ad-media-buy**: Native programmatic buying workflows
- **ad-creative**: Advertising-specific creative management

**MCP-First Categories**:
- **ad-analytics**: Mature, read-only APIs from Google Analytics and AppsFlyer
- **reporting**: Established measurement platforms

**Selection Criteria**:
1. Category matching (required)
2. Permission scope coverage (required)
3. Data residency compatibility (required)
4. Sensitivity level compliance (required)
5. Trust requirements (signed servers preferred)
6. Deterministic tie-breaking (alphabetical by ID)

### 4. Resolution Results

For the test agent (`adcp-mcp-router@1.0.0`), the resolver selected:

1. **ad-signals** → **Optable AdCP** (AdCP-first preference)
   - Rejected: Scope3, Yahoo (lost alphabetical tie-break)
   - Reason: Native signals activation support

2. **ad-media-buy** → **PubMatic AdCP** (AdCP-first preference)
   - Rejected: Yahoo (lost tie-break), Google Ads (missing scope)
   - Reason: Full Media Buy Protocol support

3. **ad-analytics** → **AppsFlyer MCP** (MCP-first preference)
   - Rejected: Google Ads, Google Analytics (lost tie-break)
   - Reason: Mature mobile attribution API

4. **ad-creative** → **Magnite AdCP** (AdCP-first preference)
   - Rejected: Triton Digital (sensitivity exceeded)
   - Reason: Only matching candidate for creative workflow

### 5. Constraint Filtering Examples

**Sensitivity Filtering**:
- Agent requires `confidential` sensitivity
- Rejected Triton Digital (max: `internal`) for creative
- Rejected Swivel (max: `internal`) for media-buy

**Scope Matching**:
- Google Ads rejected for media-buy (missing `read:products` scope)
- Weather Company rejected for signals (missing `write:audiences` scope)

**Deterministic Tie-Breaking**:
- AppsFlyer beats Google Analytics alphabetically for analytics
- Optable beats Scope3 alphabetically for signals
- PubMatic beats Yahoo alphabetically for media-buy

## Industry Context

### The "OpenRTB for AI Era"
AdCP is positioned as the successor to OpenRTB for agentic workflows:
- **OpenRTB** (2010s): Standardized real-time bidding
- **AdCP** (2025): Standardizes agent-to-agent advertising automation

### Convergence of Protocols
By late 2025, advertisers operate in a dual-protocol world:
- **Legacy platforms**: Adopting general-purpose MCP
- **New workflows**: Adopting advertising-native AdCP
- **Agents**: Must intelligently route between both

### Trust and Governance
All production advertising platforms require:
- Cryptographic signing (trust verification)
- Data residency compliance (US/EU)
- Sensitivity level enforcement (PII handling)
- Scope-based permissions (least privilege)

## Technical Achievements

1. **Deterministic Resolution**: Same inputs always produce identical lockfiles
2. **Auditable Decisions**: Every accept/reject has a machine-readable reason code
3. **Constraint Enforcement**: Hard failures prevent misconfiguration
4. **Protocol Agnostic**: Works with both AdCP and MCP seamlessly
5. **Enterprise-Ready**: Supports policies, registries, audit webhooks

## Files Generated

- `agents.md`: Agent requirements and constraints (input)
- `mcp.index.json`: 12 production advertising platforms (input)
- `agents.lock`: Deterministic lockfile with SHA-256 hashes (output)
- `agents.resolution.json`: Full explanation of decisions (output)
- `routing-policy.json`: Protocol preference policies (documentation)

## Validation Results

```bash
✓ agents.md frontmatter valid
✓ mcp.index.json valid (12 servers)
✓ Resolution complete
  - 4 requirements satisfied
  - 4 servers selected
  - 0 failures
```

## References

### Primary Sources
- [AdCP Official Site](https://adcontextprotocol.org/)
- [AdCP GitHub](https://github.com/adcontextprotocol/adcp)
- [Google Ads MCP Server](https://github.com/google-marketing-solutions/google_ads_mcp)
- [Industry Coalition Launch Announcement](https://www.samba.tv/press-releases/industry-coalition-launches-ad-context-protocol-adcp-open-standard-for-agentic-advertising-infrastructure)

### Analysis & Commentary
- [Shelly Palmer: AdCP Analysis](https://shellypalmer.com/2025/10/adcp-ad-context-protocol-a-real-attempt-to-make-agents-buy-media/)
- [ExchangeWire: Industry Perspective](https://www.exchangewire.com/blog/2025/10/23/what-the-ad-tech-industry-makes-of-the-adcp-agentic-ai-standard/)
- [Digiday: WTF is AdCP?](https://digiday.com/media-buying/wtf-ad-context-protocol/)
- [VideoWeek: Agent-to-Agent Trading](https://videoweek.com/2025/10/15/industry-coalition-ushers-in-age-of-agent-to-agent-trading-with-ad-context-protocol-launch/)

### Platform Documentation
- [Google Analytics MCP Server](https://developers.google.com/analytics/devguides/MCP)
- [AppsFlyer MCP](https://www.appsflyer.com/blog/measurement-analytics/appsflyer-mcp-ai/)
- [Google Ads API MCP Server](https://ads-developers.googleblog.com/2025/10/open-source-google-ads-api-mcp-server.html)

## Conclusions

This example demonstrates:
1. **Real-world complexity**: 12 production platforms, 2 protocol families, 20+ categories
2. **Intelligent routing**: Protocol selection based on workflow type and platform maturity
3. **Deterministic behavior**: Same requirements always yield same lockfile
4. **Audit compliance**: Full traceability of all selection decisions
5. **Future-proof design**: Supports both established (MCP) and emerging (AdCP) standards

The AdCP/MCP router agent showcases how deterministic agent resolution can handle the complexity of a rapidly evolving advertising technology landscape while maintaining reproducibility, auditability, and safety.

---

**Generated**: 2025-12-28
**Agent Resolver Version**: 0.1.0
**AdCP Version**: 2.5.0
**MCP Version**: 1.0.0
