---
name: adcp-mcp-router
version: 1.0.0
requires:
  mcp:
    - category: ad-signals
      permissions:
        - read:audiences
        - write:audiences
        - activate:signals
    - category: ad-media-buy
      permissions:
        - read:products
        - create:media-buy
        - read:delivery
    - category: ad-analytics
      permissions:
        - read:reports
        - read:metrics
        - read:campaigns
    - category: ad-creative
      permissions:
        - read:creatives
        - write:creatives
constraints:
  data:
    sensitivity: confidential
    residency: any
  actions:
    forbid:
      - delete:campaigns
      - write:billing
---

# AdCP/MCP Router Agent

An intelligent routing agent that automatically selects between **AdCP (Ad Context Protocol)** and **MCP (Model Context Protocol)** servers based on platform capabilities and advertising workflow requirements.

## Overview

This agent demonstrates deterministic routing between:
- **AdCP-native platforms**: Scope3, Yahoo, PubMatic, Optable, Swivel, Triton Digital (advertising-specific protocols)
- **MCP-enabled platforms**: Google Ads, Google Analytics, AppsFlyer (general-purpose model context protocol)

## Use Cases

### 1. Signals Activation (AdCP Priority)
When activating audience signals, the router prioritizes AdCP servers that support the Signals Activation Protocol:
- **Primary**: Scope3 (full AdCP support)
- **Fallback**: MCP servers with audience capabilities

### 2. Media Buying (AdCP Priority)
For programmatic media buying workflows:
- **Primary**: AdCP Media Buy Protocol servers (Yahoo, PubMatic)
- **Fallback**: MCP servers with campaign management

### 3. Analytics & Reporting (MCP Priority)
For analytics and performance reporting:
- **Primary**: Google Analytics MCP, AppsFlyer MCP (read-only, established APIs)
- **Fallback**: AdCP reporting modules

### 4. Creative Management (Mixed)
For creative asset management:
- **Primary**: AdCP Creative Protocol servers
- **Fallback**: MCP servers with creative capabilities

## Requirements

### Ad Signals (AdCP-first)
- **Permissions**: read:audiences, write:audiences, activate:signals
- **Protocol preference**: AdCP Signals Activation Protocol > MCP audiences
- **Platforms**: Scope3, Optable, Yahoo

### Media Buy (AdCP-first)
- **Permissions**: read:products, create:media-buy, read:delivery
- **Protocol preference**: AdCP Media Buy Protocol > MCP campaigns
- **Platforms**: Yahoo, PubMatic, Swivel

### Analytics (MCP-first)
- **Permissions**: read:reports, read:metrics, read:campaigns
- **Protocol preference**: MCP analytics > AdCP reporting
- **Platforms**: Google Analytics, AppsFlyer, Google Ads

### Creative (AdCP-first)
- **Permissions**: read:creatives, write:creatives
- **Protocol preference**: AdCP Creative Protocol > MCP assets
- **Platforms**: Triton Digital, Magnite

## Routing Logic

The agent uses deterministic selection:

1. **Category matching**: Find servers supporting required advertising categories
2. **Protocol preference**:
   - Ad operations (signals, media-buy, creative) → prefer AdCP
   - Analytics/measurement → prefer MCP (more mature implementations)
3. **Constraint filtering**: Apply residency, sensitivity, trust policies
4. **Deterministic tie-break**: Signed > alphabetical

## Platform Support Matrix

| Platform | Protocol | Categories | Launch Date | Status |
|----------|----------|------------|-------------|--------|
| Scope3 | AdCP | Signals, Sustainability | Oct 2025 | Full support |
| Yahoo | AdCP | Signals, Media Buy | Oct 2025 | Full support |
| PubMatic | AdCP | Media Buy, Supply | Oct 2025 | Full support |
| Optable | AdCP | Signals, Audiences | Oct 2025 | Full support |
| Google Ads | MCP | Campaigns, Ads | Oct 2025 | Full support |
| Google Analytics | MCP | Analytics, Reporting | Jul 2025 | Read-only |
| AppsFlyer | MCP | Attribution, Analytics | Jul 2025 | Full support |
| Swivel | AdCP | Media Buy, Planning | Oct 2025 | Full support |
| Triton Digital | AdCP | Audio, Creative | Oct 2025 | Full support |
| Magnite | AdCP | SSP, Creative | Oct 2025 | Launch member |

## Constraints

- **Data sensitivity**: Confidential (handles PII-adjacent advertising data)
- **Data residency**: Any (global advertising campaigns)
- **Forbidden actions**: delete:campaigns, write:billing (safety-first)

## Expected Resolution

Running `agent resolve` should select:
1. **Scope3 AdCP** for signals activation
2. **Yahoo AdCP** for media buying
3. **Google Analytics MCP** for analytics
4. **Triton Digital AdCP** for creatives

Use `agent resolve --explain` to see the full decision tree and rejected candidates.
