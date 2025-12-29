# Building an Intelligent Router for the Dual-Protocol Advertising Era

**December 28, 2025**

The advertising industry is undergoing a fundamental transformation. As AI agents become the primary interface for managing advertising workflows, we're witnessing the emergence of two competing yet complementary protocol standards: AdCP (Ad Context Protocol) and MCP (Model Context Protocol). This creates a new challenge: how do we build agents that can intelligently navigate this dual-protocol landscape?

In this post, I'll share my experience building a deterministic router agent that automatically selects between AdCP and MCP servers based on workflow requirements, platform capabilities, and governance constraints.

## The Protocol Landscape: A Tale of Two Standards

### AdCP: Purpose-Built for Advertising

On October 15, 2025, a consortium of over 20 advertising companies launched AdCP—an open standard they're calling "OpenRTB for the AI era." Led by industry heavyweights like Yahoo, PubMatic, Scope3, Optable, Swivel, and Triton Digital, AdCP addresses a fundamental gap: while OpenRTB standardized real-time bidding, there was no standard for agent-to-agent advertising workflows.

Built on Anthropic's Model Context Protocol, AdCP introduces three key modules:
- **Signals Activation Protocol**: For audience targeting and activation
- **Media Buy Protocol**: For programmatic buying workflows
- **Creative Protocol**: For ad creative management

The protocol is designed specifically for advertising operations, with native support for concepts like inventory discovery, campaign orchestration, and cross-platform activation.

### MCP: The Tech Giants' Answer

Before AdCP emerged, major tech platforms were already adopting MCP for advertising integrations:
- **Google Analytics** (July 22, 2025): Read-only analytics access
- **AppsFlyer** (July 17, 2025): Mobile attribution and measurement
- **Google Ads** (October 7, 2025): Full campaign management API

These platforms chose the general-purpose Model Context Protocol, which provides flexibility but lacks advertising-specific abstractions.

### The Convergence Challenge

By late 2025, advertisers face a reality: they need agents that can work with both protocols. AdCP offers cutting-edge advertising workflows, while MCP provides access to established platforms like Google's ecosystem. Neither is going away.

This is where intelligent routing becomes critical.

## Building the Router: Design Principles

When building the AdCP/MCP router agent, I followed five core principles:

### 1. Deterministic Over Probabilistic

Every decision the router makes must be reproducible. Given the same inputs, the router must always produce identical outputs, byte-for-byte. This means no LLM-based reasoning in the core logic—just pure deterministic algorithms.

Why? Because advertising operations require audit trails. When a campaign routes through a specific platform, stakeholders need to understand *why* that decision was made, and they need confidence that the same configuration will always yield the same result.

### 2. Protocol-Aware Routing

Not all advertising workflows are created equal. The router implements intelligent protocol preferences based on workflow type:

**AdCP-First Categories:**
- **Signals Activation**: AdCP's native Signals Activation Protocol provides better workflow integration than generic audience APIs
- **Media Buying**: AdCP's Media Buy Protocol is purpose-built for programmatic buying
- **Creative Management**: AdCP's Creative Protocol handles advertising-specific asset workflows

**MCP-First Categories:**
- **Analytics**: Google Analytics and AppsFlyer offer mature, battle-tested read-only APIs via MCP
- **Reporting**: Established measurement platforms have proven MCP implementations

### 3. Constraint-Based Filtering

The router enforces hard constraints before making selections:
- **Data Residency**: US-only agents can't use EU-only servers (and vice versa)
- **Sensitivity Levels**: Agents handling "confidential" data can't use servers with lower maximums
- **Permission Scopes**: Servers must support all required permissions
- **Trust Requirements**: Production workflows require cryptographically signed servers

If any constraint can't be satisfied, the router fails fast with actionable error messages.

### 4. Auditable Decisions

Every accept/reject decision includes:
- **Reason Code**: Machine-readable (`MISSING_SCOPE`, `SENSITIVITY_EXCEEDED`, etc.)
- **Human Message**: Clear explanation for operators
- **Context**: The exact constraint values that led to the decision

This creates a complete audit trail for compliance and troubleshooting.

### 5. Future-Proof Architecture

The router treats protocols as first-class configuration, not hardcoded logic. Adding a new protocol (or a new version of AdCP/MCP) requires only updating the server index—no code changes.

## Implementation: The Platform Matrix

The reference implementation includes 12 production advertising platforms:

### AdCP Platforms (v2.5.0)

| Platform | Modules | Launch Status |
|----------|---------|---------------|
| **Scope3** | Signals Activation | Full support |
| **Yahoo** | Signals + Media Buy | Full support |
| **PubMatic** | Media Buy | Full support |
| **Optable** | Signals (Data Clean Room) | Full support |
| **Swivel** | Media Buy + Planning | Full support |
| **Triton Digital** | Creative (Audio) | Full support |
| **Magnite** | Creative (CTV) | Launch member |
| **Samba TV** | Signals (CTV) | Launch member |
| **Weather Company** | Signals (Contextual) | Launch member |

### MCP Platforms (v1.0.0)

| Platform | Categories | Release Date |
|----------|-----------|--------------|
| **Google Ads** | Campaigns, Analytics | Oct 7, 2025 |
| **Google Analytics** | Analytics, Reporting | Jul 22, 2025 |
| **AppsFlyer** | Attribution, Analytics | Jul 17, 2025 |

## Real-World Resolution: A Case Study

Let me walk through an actual resolution for a multi-channel advertising agent with four requirements:

### Requirement 1: Signals Activation
**Need**: `read:audiences`, `write:audiences`, `activate:signals`

**Candidates**: Scope3, Yahoo, Optable, Samba TV, Weather Company

**Decision**: **Optable AdCP** selected via deterministic tie-breaking
- All candidates are signed (trust requirement met)
- Alphabetical ordering: Optable < Samba < Scope3 < Weather < Yahoo
- Weather Company rejected: missing `write:audiences` scope

**Reasoning**: AdCP Signals Activation Protocol provides native support for audience activation workflows, superior to generic MCP audience APIs.

### Requirement 2: Media Buying
**Need**: `read:products`, `create:media-buy`, `read:delivery`

**Candidates**: Yahoo, PubMatic, Google Ads, Swivel

**Decision**: **PubMatic AdCP** selected

**Rejections**:
- Google Ads MCP: Missing `read:products` scope
- Swivel AdCP: Agent sensitivity "confidential" exceeds server max "internal"
- Yahoo AdCP: Lost alphabetical tie-break to PubMatic

**Reasoning**: AdCP Media Buy Protocol designed for programmatic workflows.

### Requirement 3: Analytics
**Need**: `read:reports`, `read:metrics`, `read:campaigns`

**Candidates**: Google Ads, Google Analytics, AppsFlyer

**Decision**: **AppsFlyer MCP** selected via tie-breaking
- All three support required scopes
- All three are signed
- Alphabetical: AppsFlyer < Google Ads < Google Analytics

**Reasoning**: Prefer MCP for analytics—mature, read-only APIs with established track records.

### Requirement 4: Creative Management
**Need**: `read:creatives`, `write:creatives`

**Candidates**: Triton Digital, Magnite

**Decision**: **Magnite AdCP** selected

**Rejections**:
- Triton Digital: Agent sensitivity "confidential" exceeds server max "internal"

**Reasoning**: Only matching candidate; AdCP Creative Protocol handles advertising-specific creative workflows.

## The Resolution Artifact

The router generates two key outputs:

### 1. `agents.lock` (Deterministic Lockfile)
```json
{
  "agentName": "adcp-mcp-router",
  "agentVersion": "1.0.0",
  "resolvedAt": "2025-12-28T19:53:06.289Z",
  "servers": [
    {
      "category": "ad-signals",
      "serverId": "optable-adcp",
      "version": "2.5.0",
      "endpoint": "https://adcp.optable.co/mcp",
      "scopes": ["activate:signals", "read:audiences", "write:audiences"],
      "hash": "sha256:e98e08f..."
    },
    // ... additional servers
  ]
}
```

Each server selection includes a SHA-256 hash for integrity verification, ensuring the lockfile hasn't been tampered with.

### 2. `agents.resolution.json` (Audit Trail)
```json
{
  "requirements": [
    {
      "category": "ad-signals",
      "selected": {
        "serverId": "optable-adcp",
        "selectionReason": "Selected by tie-break: signed, id='optable-adcp'"
      },
      "rejected": [
        {
          "serverId": "scope3-adcp",
          "reason": {
            "code": "MISSING_CATEGORY",
            "message": "Not selected: lost tie-break to 'optable-adcp@2.5.0'"
          }
        }
      ]
    }
  ]
}
```

This provides complete transparency into why each platform was selected or rejected.

## Industry Implications

### 1. Protocol Coexistence Is Reality

AdCP won't replace MCP, and MCP won't replace AdCP. Just as we have TCP/IP *and* HTTP, we'll have MCP *and* AdCP. The industry is complex enough to support both.

**AdCP excels at**: Purpose-built advertising workflows (signals, programmatic buying, creative)
**MCP excels at**: General-purpose platform integrations (Google ecosystem, mobile attribution)

Smart agents will use both.

### 2. Determinism Enables Trust

In an industry plagued by black-box algorithms, deterministic routing provides transparency. Advertisers can:
- Understand exactly why their campaign routed to specific platforms
- Reproduce results for compliance audits
- Identify configuration issues before campaigns launch
- Build confidence in automated workflows

### 3. Governance As Code

The router treats constraints as first-class configuration:
```yaml
constraints:
  data:
    sensitivity: confidential
    residency: eu-only
  actions:
    forbid:
      - delete:campaigns
      - write:billing
```

This "policy-as-code" approach enables:
- Version control for governance rules
- Automated compliance checking
- GitOps workflows for advertising operations
- Clear separation between business rules and implementation

### 4. The Death of Manual Integration

Before standards like AdCP and MCP, integrating with each advertising platform required custom code. With protocol-based routing, new platforms become drop-in additions to the server index.

Adding Magnite CTV support? Just add an entry:
```json
{
  "id": "magnite-adcp",
  "version": "2.5.0",
  "categories": ["ad-creative", "ctv"],
  "protocol": "adcp"
}
```

No code changes. No redeployment. Just configuration.

## Lessons Learned

### 1. Don't Over-Optimize for Hypothetical Futures

I initially built complex protocol preference scoring. Then I realized: just encode the preference directly. "AdCP-first for signals" is clearer than a weighted scoring algorithm.

Simple rules beat complex heuristics when the domain is well-understood.

### 2. Fail Fast, Fail Loud

When constraints can't be satisfied, the router fails immediately with actionable errors. This is better than silently downgrading to a less-secure platform.

Example: If an agent requires EU data residency but only US servers are available, that's a *hard failure*. Don't paper over governance requirements.

### 3. Audit Trails Are Features, Not Overhead

The `agents.resolution.json` explanation file felt like extra work initially. But it became the most valuable output—enabling troubleshooting, compliance, and education.

Every "reject" reason became a teaching moment for operators.

### 4. Alphabetical Tie-Breaking Is Underrated

When multiple servers satisfy all requirements, how do you choose? LLM reasoning? Weighted scores? Machine learning?

Answer: alphabetical ordering.

Why? Because it's:
- Deterministic
- Transparent
- Explainable
- Reproducible
- Good enough

Perfect is the enemy of shipped.

## What's Next?

The advertising industry is at an inflection point. As AI agents become the primary interface for advertising operations, we need infrastructure that's:
- **Deterministic**: Same inputs → same outputs
- **Auditable**: Every decision is traceable
- **Protocol-agnostic**: Works with AdCP, MCP, and future standards
- **Governance-first**: Constraints are enforced, not suggested

This router agent is a proof-of-concept. The real work is ahead: standardizing routing policies, building production-grade registries, and establishing governance frameworks.

But the core insight is proven: intelligent protocol routing is not just possible—it's necessary.

## Try It Yourself

The full implementation is open source and available on GitHub. The example includes:
- 12 production advertising platforms
- Complete routing policies
- Audit trail generation
- Constraint enforcement

To run it:
```bash
git clone https://github.com/ManoPillai01/Playground
cd Playground/examples/adcp-router-agent

# Validate configuration
npx agent validate

# See available platforms
npx agent discover

# Resolve with full explanation
npx agent resolve --explain
```

The lockfile and resolution explanation demonstrate exactly how the router makes decisions.

## Closing Thoughts

We're witnessing the birth of a new layer in the advertising stack: the protocol routing layer. Just as DNS routes domain names to IP addresses, and load balancers route requests to servers, advertising agents will route workflows to protocols.

This isn't just a technical curiosity—it's infrastructure for the agentic advertising era.

The question isn't *whether* advertisers will need protocol routing. The question is: will it be deterministic and auditable, or will it be a black box?

I vote for transparency.

---

**Want to discuss protocol routing, AdCP, or MCP?** Connect with me on [LinkedIn](https://linkedin.com) or explore the [full implementation on GitHub](https://github.com/ManoPillai01/Playground/tree/main/examples/adcp-router-agent).

## References

1. [Ad Context Protocol Official Site](https://adcontextprotocol.org/)
2. [AdCP GitHub Repository](https://github.com/adcontextprotocol/adcp)
3. [Google Ads MCP Server Launch](https://ads-developers.googleblog.com/2025/10/open-source-google-ads-api-mcp-server.html)
4. [Shelly Palmer: AdCP Analysis](https://shellypalmer.com/2025/10/adcp-ad-context-protocol-a-real-attempt-to-make-agents-buy-media/)
5. [ExchangeWire: Industry Perspective on AdCP](https://www.exchangewire.com/blog/2025/10/23/what-the-ad-tech-industry-makes-of-the-adcp-agentic-ai-standard/)
6. [Industry Coalition Launch Announcement](https://www.samba.tv/press-releases/industry-coalition-launches-ad-context-protocol-adcp-open-standard-for-agentic-advertising-infrastructure)
7. [Google Analytics MCP Documentation](https://developers.google.com/analytics/devguides/MCP)
8. [AppsFlyer MCP Announcement](https://www.appsflyer.com/blog/measurement-analytics/appsflyer-mcp-ai/)

---

*This blog post describes a working implementation built on December 28, 2025, using publicly available information about AdCP (launched Oct 15, 2025) and MCP adoption by major advertising platforms.*
