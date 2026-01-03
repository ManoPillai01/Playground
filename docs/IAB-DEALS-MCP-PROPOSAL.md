# Proposal: IAB Deals API Mock MCP Server

> **Author:** Claude
> **Date:** 2026-01-03
> **Status:** Draft Proposal

## Executive Summary

This proposal outlines the design and implementation of a mock MCP (Model Context Protocol) server that simulates the IAB Tech Lab Deals API. This server will enable developers and AI agents to interact with programmatic advertising deal data in a standardized way, facilitating testing, development, and demonstration of deal sync workflows without requiring access to production SSP/DSP systems.

## Background

### IAB Deals API v1.0

IAB Tech Lab released the [Deals API v1.0 specification](https://iabtechlab.com/standards/dealsapi/) in December 2025 (currently in public comment until January 31, 2026). The specification addresses key inefficiencies in the programmatic supply chain for high-value, curated, private marketplaces.

**Key Features:**
- Standardized schema for programmatic deal metadata
- Communication of deals from origin systems (SSPs) to receiving systems (DSPs)
- Transparency into deal structure including seller, packager, and curator identification
- Reduces manual entry errors and improves operational efficiency

### OpenRTB 2.6 Deal Object

The [OpenRTB 2.6 specification](https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md) defines the Deal object used in bid requests:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | **Required.** Unique identifier for the direct deal |
| `bidfloor` | float | Minimum bid for this impression (CPM), default 0 |
| `bidfloorcur` | string | Currency (ISO-4217), default "USD" |
| `wseat` | string[] | Allowlist of buyer seats that can bid |
| `wadomain` | string[] | Allowlist of advertiser domains |
| `at` | integer | Auction type override |
| `mincpmpersec` | float | Minimum CPM per second (for audio/video) |

### Model Context Protocol (MCP)

[MCP](https://github.com/modelcontextprotocol/typescript-sdk) provides a standardized way for LLM applications to access tools, resources, and data. Key concepts:
- **Tools:** Callable functions exposed to LLM clients
- **Resources:** Read-only data sources
- **Prompts:** Reusable templates for LLM interaction

## Proposed Architecture

### Package Structure

Following the existing monorepo pattern:

```
packages/
├── deals-mcp-server/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── server.ts         # MCP server setup
│   │   ├── tools/            # Tool implementations
│   │   │   ├── list-deals.ts
│   │   │   ├── get-deal.ts
│   │   │   ├── create-deal.ts
│   │   │   ├── update-deal.ts
│   │   │   ├── sync-deal.ts
│   │   │   └── validate-deal.ts
│   │   ├── resources/        # Resource handlers
│   │   │   ├── deal-catalog.ts
│   │   │   └── deal-schema.ts
│   │   ├── store/            # In-memory data store
│   │   │   └── deals-store.ts
│   │   └── types/            # TypeScript types
│   │       └── deals.ts
│   └── tsconfig.json
├── deals-schema/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── deal.ts           # Core Deal schema
│   │   ├── deal-terms.ts     # Deal terms schema
│   │   ├── inventory.ts      # Inventory info schema
│   │   ├── curation.ts       # Curation info schema
│   │   ├── buyer-status.ts   # Buyer status schema
│   │   └── pmp.ts            # Private marketplace schema
│   └── tsconfig.json
```

### Data Models

#### Deal Object (based on OpenRTB 2.6 + Deals API v1.0)

```typescript
import { z } from 'zod';

export const DealTerms = z.object({
  auctionType: z.enum(['first-price', 'second-price', 'fixed-price']),
  bidFloor: z.number().min(0).default(0),
  bidFloorCurrency: z.string().default('USD'),
  minCpmPerSec: z.number().optional(),
  guaranteedImpressions: z.number().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const InventoryInfo = z.object({
  publisherIds: z.array(z.string()),
  siteIds: z.array(z.string()).optional(),
  appIds: z.array(z.string()).optional(),
  placementIds: z.array(z.string()).optional(),
  formats: z.array(z.enum(['banner', 'video', 'audio', 'native'])),
  deviceTypes: z.array(z.enum(['desktop', 'mobile', 'tablet', 'ctv'])).optional(),
  geoTargeting: z.object({
    countries: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
  }).optional(),
});

export const CurationInfo = z.object({
  curatorId: z.string(),
  curatorName: z.string(),
  packagerId: z.string().optional(),
  packagerName: z.string().optional(),
  sellerId: z.string(),
  sellerName: z.string(),
  supplyChain: z.array(z.object({
    asi: z.string(),
    sid: z.string(),
    hp: z.boolean(),
  })).optional(),
});

export const BuyerStatus = z.object({
  status: z.enum(['pending', 'active', 'paused', 'rejected', 'expired']),
  comment: z.string().optional(),
  lastUpdated: z.string().datetime(),
  activatedAt: z.string().datetime().optional(),
});

export const Deal = z.object({
  id: z.string().min(1),
  name: z.string(),
  version: z.string().default('1.0'),

  // Parties
  buyerSeats: z.array(z.string()).optional(),
  advertiserDomains: z.array(z.string()).optional(),

  // Terms
  terms: DealTerms,

  // Inventory
  inventory: InventoryInfo,

  // Curation
  curation: CurationInfo.optional(),

  // Status
  buyerStatus: BuyerStatus.optional(),

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  hash: z.string().optional(), // For deterministic lockfile
});

export type Deal = z.infer<typeof Deal>;
```

### MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `deals_list` | List all available deals | `filters?: { status?, format?, buyerSeat? }` |
| `deals_get` | Get a specific deal by ID | `dealId: string` |
| `deals_create` | Create a new mock deal | `deal: Partial<Deal>` |
| `deals_update` | Update an existing deal | `dealId: string, updates: Partial<Deal>` |
| `deals_sync` | Simulate deal sync to DSP | `dealId: string, dspId: string` |
| `deals_validate` | Validate deal against schema | `deal: unknown` |
| `deals_match` | Check if bid request matches deal | `dealId: string, bidRequest: object` |

### MCP Resources

| Resource | Description |
|----------|-------------|
| `deals://catalog` | Full catalog of available deals |
| `deals://schema` | JSON Schema for deal validation |
| `deals://openrtb/pmp` | OpenRTB PMP object template |

### Mock Data Generator

The server will include a mock data generator to create realistic deal data:

```typescript
export function generateMockDeal(overrides?: Partial<Deal>): Deal {
  return {
    id: `deal-${crypto.randomUUID().slice(0, 8)}`,
    name: `${faker.company.name()} PMP Deal`,
    version: '1.0',
    buyerSeats: [faker.string.alphanumeric(8)],
    advertiserDomains: [faker.internet.domainName()],
    terms: {
      auctionType: 'first-price',
      bidFloor: faker.number.float({ min: 1, max: 50, precision: 0.01 }),
      bidFloorCurrency: 'USD',
    },
    inventory: {
      publisherIds: [faker.string.alphanumeric(10)],
      formats: ['banner', 'video'],
    },
    curation: {
      curatorId: faker.string.alphanumeric(8),
      curatorName: faker.company.name(),
      sellerId: faker.string.alphanumeric(8),
      sellerName: faker.company.name(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
```

## Implementation Plan

### Phase 1: Schema & Types
- [ ] Create `packages/deals-schema` with Zod schemas
- [ ] Define all deal-related types matching IAB specifications
- [ ] Add unit tests for schema validation

### Phase 2: MCP Server Core
- [ ] Initialize `packages/deals-mcp-server`
- [ ] Set up MCP server with `@modelcontextprotocol/sdk`
- [ ] Implement in-memory deals store
- [ ] Add mock data seeding

### Phase 3: Tools Implementation
- [ ] Implement `deals_list` tool
- [ ] Implement `deals_get` tool
- [ ] Implement `deals_create` tool
- [ ] Implement `deals_update` tool
- [ ] Implement `deals_sync` tool (simulated)
- [ ] Implement `deals_validate` tool
- [ ] Implement `deals_match` tool

### Phase 4: Resources & Prompts
- [ ] Implement `deals://catalog` resource
- [ ] Implement `deals://schema` resource
- [ ] Add helpful prompts for deal management

### Phase 5: Integration & Testing
- [ ] Add integration tests
- [ ] Create example usage documentation
- [ ] Add to CI/CD workflow
- [ ] Update mcp.index.json with new server

## Example Usage

### Starting the Server

```bash
npx agent deals-server --port 3001
```

### Tool Invocation Examples

**List Deals:**
```json
{
  "tool": "deals_list",
  "arguments": {
    "filters": {
      "status": "active",
      "format": "video"
    }
  }
}
```

**Create Deal:**
```json
{
  "tool": "deals_create",
  "arguments": {
    "deal": {
      "name": "Premium Video PMP",
      "terms": {
        "auctionType": "first-price",
        "bidFloor": 15.00,
        "bidFloorCurrency": "USD"
      },
      "inventory": {
        "publisherIds": ["pub-12345"],
        "formats": ["video"]
      }
    }
  }
}
```

**Sync to DSP:**
```json
{
  "tool": "deals_sync",
  "arguments": {
    "dealId": "deal-abc123",
    "dspId": "dsp-thetradedesk"
  }
}
```

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.25.0",
    "zod": "^3.25.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@faker-js/faker": "^8.0.0"
  }
}
```

## Integration with Existing Codebase

This proposal aligns with the existing monorepo structure:
- Uses the same tech stack (TypeScript, Zod, Commander)
- Follows deterministic principles from CLAUDE.md
- Can be referenced in `mcp.index.json` for discovery
- Compatible with the agent resolver CLI

### mcp.index.json Entry

```json
{
  "id": "iab-deals",
  "version": "1.0.0",
  "endpoint": "stdio://agent-deals-server",
  "categories": ["deals", "programmatic", "advertising"],
  "scopes": ["read:deals", "write:deals", "sync:deals"],
  "data": {
    "residency": ["any"],
    "maxSensitivity": "confidential"
  },
  "trust": {
    "signed": false,
    "publisher": "Agent Resolver"
  }
}
```

## Benefits

1. **Development & Testing:** Enables testing of deal workflows without production access
2. **Education:** Helps developers understand IAB Deals API structure
3. **Integration Testing:** Allows SSP/DSP integration testing with realistic mock data
4. **AI Agent Compatibility:** LLM agents can manage programmatic deals via MCP
5. **Extensibility:** Foundation for future real SSP/DSP integrations

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Deals API spec still in public comment | Design for flexibility, update when spec finalizes |
| Complex domain knowledge required | Include comprehensive documentation and examples |
| Mock data may diverge from reality | Use realistic generators based on industry patterns |

## Next Steps

1. Review and approve this proposal
2. Create feature branch for implementation
3. Implement Phase 1 (Schema & Types)
4. Iterate through remaining phases
5. Gather feedback and refine

## References

- [IAB Tech Lab Deals API](https://iabtechlab.com/standards/dealsapi/)
- [OpenRTB 2.6 Specification](https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [IAB Tech Lab GitHub](https://github.com/InteractiveAdvertisingBureau)
