# IAB Deals API Mock MCP Server

A Model Context Protocol (MCP) server that implements a mock version of the [IAB Tech Lab Deals API v1.0](https://iabtechlab.com/standards/dealsapi/) specification. This server enables AI agents and developers to interact with programmatic advertising deal data in a standardized way.

## Overview

The IAB Deals API specification (released December 2025) standardizes how programmatic deals are communicated between Supply-Side Platforms (SSPs) and Demand-Side Platforms (DSPs). This mock server provides:

- **8 MCP Tools** for deal CRUD operations, validation, and matching
- **4 MCP Resources** for deal catalogs, schemas, and statistics
- **5 Pre-seeded Mock Deals** covering various ad formats and deal types
- **Full OpenRTB 2.6 Compatibility** for deal objects and PMP structures

## Installation

```bash
# From the monorepo root
npm install

# Build all packages
npm run build
```

## Quick Start

### Starting the MCP Server

```bash
# Using the CLI
npm run agent -- deals serve

# Or directly
node packages/deals-mcp-server/dist/index.js
```

The server uses stdio transport, making it compatible with MCP clients like Claude Desktop.

### Listing Deals (Debug Mode)

```bash
npm run agent -- deals list
npm run agent -- deals list --format json
```

### Server Information

```bash
npm run agent -- deals info
```

## MCP Tools Reference

### deals_list

List all available deals with optional filtering.

**Input Schema:**
```json
{
  "filters": {
    "status": "active" | "pending" | "paused" | "rejected" | "expired",
    "format": "banner" | "video" | "audio" | "native",
    "buyerSeat": "string",
    "curatorId": "string",
    "publisherId": "string"
  }
}
```

**Example Response:**
```json
{
  "count": 5,
  "deals": [
    {
      "id": "deal-abc123",
      "name": "Premium Video PMP",
      "version": "1.0",
      "status": "active",
      "bidFloor": 15.0,
      "currency": "USD",
      "formats": ["video"],
      "curator": "Premium Curations Inc"
    }
  ]
}
```

### deals_get

Get detailed information about a specific deal.

**Input Schema:**
```json
{
  "dealId": "string (required)"
}
```

**Example Response:**
```json
{
  "deal": {
    "id": "deal-abc123",
    "name": "Premium Video PMP",
    "version": "1.0",
    "terms": {
      "auctionType": "first-price",
      "bidFloor": 15.0,
      "bidFloorCurrency": "USD"
    },
    "inventory": {
      "publisherIds": ["pub-001"],
      "formats": ["video"],
      "deviceTypes": ["desktop", "ctv"]
    },
    "curation": {
      "curatorId": "cur-001",
      "curatorName": "Premium Curations Inc",
      "sellerId": "seller-001",
      "sellerName": "Acme Media"
    },
    "createdAt": "2026-01-03T00:00:00Z",
    "updatedAt": "2026-01-03T00:00:00Z",
    "hash": "a1b2c3d4e5f6g7h8"
  }
}
```

### deals_create

Create a new programmatic deal.

**Input Schema:**
```json
{
  "deal": {
    "name": "string (required)",
    "version": "string (optional, default: '1.0')",
    "terms": {
      "auctionType": "first-price" | "second-price" | "fixed-price",
      "bidFloor": "number (optional, default: 0)",
      "bidFloorCurrency": "string (optional, default: 'USD')",
      "minCpmPerSec": "number (optional)",
      "guaranteedImpressions": "integer (optional)",
      "startDate": "ISO datetime (optional)",
      "endDate": "ISO datetime (optional)"
    },
    "inventory": {
      "publisherIds": ["string (required)"],
      "siteIds": ["string (optional)"],
      "appIds": ["string (optional)"],
      "formats": ["banner" | "video" | "audio" | "native (required)"],
      "deviceTypes": ["desktop" | "mobile" | "tablet" | "ctv (optional)"],
      "geoTargeting": {
        "countries": ["string"],
        "regions": ["string"],
        "cities": ["string"]
      }
    },
    "curation": {
      "curatorId": "string",
      "curatorName": "string",
      "packagerId": "string (optional)",
      "packagerName": "string (optional)",
      "sellerId": "string",
      "sellerName": "string"
    },
    "buyerSeats": ["string (optional)"],
    "advertiserDomains": ["string (optional)"]
  }
}
```

### deals_update

Update an existing deal.

**Input Schema:**
```json
{
  "dealId": "string (required)",
  "updates": {
    "name": "string (optional)",
    "terms": { "...partial terms..." },
    "inventory": { "...partial inventory..." },
    "...other fields..."
  }
}
```

### deals_sync

Simulate syncing a deal to a DSP. This mock operation simulates the IAB Deals API push functionality.

**Input Schema:**
```json
{
  "dealId": "string (required)",
  "dspId": "string (required)",
  "dspName": "string (optional)"
}
```

**Example Response:**
```json
{
  "success": true,
  "dealId": "deal-abc123",
  "dspId": "dsp-thetradedesk",
  "syncedAt": "2026-01-03T12:00:00Z",
  "status": "pending",
  "message": "Deal 'Premium Video PMP' successfully synced to DSP The Trade Desk. Awaiting buyer confirmation."
}
```

### deals_validate

Validate a deal object against the IAB Deals API schema.

**Input Schema:**
```json
{
  "deal": { "...any object..." }
}
```

**Example Response (Valid):**
```json
{
  "valid": true,
  "message": "Deal is valid",
  "deal": { "...parsed deal..." }
}
```

**Example Response (Invalid):**
```json
{
  "valid": false,
  "errors": [
    {
      "path": "terms.bidFloor",
      "message": "Expected number, received string",
      "code": "invalid_type"
    }
  ]
}
```

### deals_match

Check if a bid request matches a deal's targeting criteria.

**Input Schema:**
```json
{
  "dealId": "string (required)",
  "bidRequest": {
    "id": "string",
    "imp": [
      {
        "id": "string",
        "banner": { "w": 300, "h": 250 },
        "video": { "mimes": ["video/mp4"] },
        "pmp": { "...optional..." }
      }
    ],
    "site": {
      "id": "string",
      "publisher": { "id": "string" }
    },
    "device": {
      "devicetype": 2,
      "geo": { "country": "US", "region": "CA" }
    },
    "user": {
      "buyeruid": "seat-123"
    }
  }
}
```

**Example Response (Matched):**
```json
{
  "dealId": "deal-abc123",
  "matched": true,
  "reasons": ["All targeting criteria matched"],
  "pmpObject": {
    "private_auction": 1,
    "deals": [
      {
        "id": "deal-abc123",
        "bidfloor": 15.0,
        "bidfloorcur": "USD",
        "wseat": ["seat-123"],
        "at": 1
      }
    ]
  }
}
```

**Example Response (Not Matched):**
```json
{
  "dealId": "deal-abc123",
  "matched": false,
  "reasons": [
    "Country FR not in deal targeting [US, CA]",
    "No matching format. Deal requires: video"
  ]
}
```

### deals_update_status

Update the buyer status of a deal.

**Input Schema:**
```json
{
  "dealId": "string (required)",
  "status": "pending" | "active" | "paused" | "rejected" | "expired",
  "comment": "string (optional)"
}
```

## MCP Resources Reference

### deals://catalog

Returns a complete catalog of all available deals.

**MIME Type:** `application/json`

**Response Structure:**
```json
{
  "version": "1.0",
  "generatedAt": "2026-01-03T12:00:00Z",
  "totalDeals": 5,
  "deals": [
    {
      "id": "deal-abc123",
      "name": "Premium Video PMP",
      "status": "active",
      "terms": { "auctionType": "first-price", "bidFloor": 15.0, "currency": "USD" },
      "inventory": { "formats": ["video"], "publishers": ["pub-001"] },
      "curator": { "id": "cur-001", "name": "Premium Curations Inc" },
      "seller": { "id": "seller-001", "name": "Acme Media" }
    }
  ]
}
```

### deals://schema

Returns the JSON Schema for deal validation.

**MIME Type:** `application/schema+json`

### deals://openrtb/pmp

Returns a template for OpenRTB 2.6 Private Marketplace (PMP) objects.

**MIME Type:** `application/json`

**Response Structure:**
```json
{
  "description": "OpenRTB 2.6 PMP Object Template",
  "template": {
    "private_auction": { "type": "integer", "values": [0, 1] },
    "deals": {
      "type": "array",
      "items": {
        "id": { "type": "string", "required": true },
        "bidfloor": { "type": "float", "default": 0 },
        "bidfloorcur": { "type": "string", "default": "USD" },
        "wseat": { "type": "array" },
        "wadomain": { "type": "array" },
        "at": { "type": "integer" }
      }
    }
  },
  "example": { "...example PMP object..." }
}
```

### deals://stats

Returns aggregated statistics about available deals.

**MIME Type:** `application/json`

**Response Structure:**
```json
{
  "generatedAt": "2026-01-03T12:00:00Z",
  "total": 5,
  "byStatus": {
    "pending": 2,
    "active": 1,
    "paused": 0,
    "rejected": 0,
    "expired": 0,
    "noStatus": 2
  },
  "byFormat": {
    "banner": 1,
    "video": 2,
    "audio": 1,
    "native": 1
  },
  "byAuctionType": {
    "first-price": 3,
    "second-price": 1,
    "fixed-price": 1
  },
  "averageBidFloor": 11.1,
  "currencies": ["USD", "EUR"],
  "curatedDeals": 4
}
```

## Data Models

### Deal Object

The main Deal object combines OpenRTB 2.6 deal fields with IAB Deals API v1.0 extensions:

```typescript
interface Deal {
  // Core Identification
  id: string;                    // Unique deal identifier
  name: string;                  // Human-readable deal name
  version: string;               // Deal version (default: "1.0")

  // Parties (OpenRTB 2.6)
  buyerSeats?: string[];         // Allowed buyer seat IDs
  advertiserDomains?: string[];  // Allowed advertiser domains

  // Terms
  terms: {
    auctionType: "first-price" | "second-price" | "fixed-price";
    bidFloor: number;            // Minimum CPM
    bidFloorCurrency: string;    // ISO-4217 (e.g., "USD")
    minCpmPerSec?: number;       // For audio/video
    guaranteedImpressions?: number;
    startDate?: string;          // ISO datetime
    endDate?: string;            // ISO datetime
  };

  // Inventory Targeting
  inventory: {
    publisherIds: string[];      // Required
    siteIds?: string[];
    appIds?: string[];
    placementIds?: string[];
    formats: ("banner" | "video" | "audio" | "native")[];
    deviceTypes?: ("desktop" | "mobile" | "tablet" | "ctv")[];
    geoTargeting?: {
      countries?: string[];
      regions?: string[];
      cities?: string[];
    };
  };

  // Curation (IAB Deals API)
  curation?: {
    curatorId: string;
    curatorName: string;
    packagerId?: string;
    packagerName?: string;
    sellerId: string;
    sellerName: string;
    supplyChain?: Array<{
      asi: string;
      sid: string;
      hp: boolean;
    }>;
  };

  // Buyer Status
  buyerStatus?: {
    status: "pending" | "active" | "paused" | "rejected" | "expired";
    comment?: string;
    lastUpdated: string;
    activatedAt?: string;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  hash?: string;                 // Deterministic content hash
}
```

## Integration Examples

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iab-deals": {
      "command": "node",
      "args": ["/path/to/packages/deals-mcp-server/dist/index.js"]
    }
  }
}
```

### Programmatic Usage

```typescript
import { dealsStore, createServer } from '@agent-resolver/deals-mcp-server';

// Access the deals store directly
const deals = dealsStore.list({ format: 'video' });
console.log(`Found ${deals.length} video deals`);

// Create a new deal
const newDeal = dealsStore.create({
  name: 'My Custom Deal',
  terms: { bidFloor: 10 },
  inventory: {
    publisherIds: ['pub-123'],
    formats: ['banner'],
  },
});

// Start the MCP server programmatically
const server = createServer();
// Connect to transport...
```

### Example: Matching a Bid Request

```typescript
// Use the deals_match tool to check targeting
const matchResult = await matchDeal.handler({
  dealId: 'deal-abc123',
  bidRequest: {
    id: 'bid-001',
    imp: [{ id: 'imp-1', video: { mimes: ['video/mp4'] } }],
    site: { publisher: { id: 'pub-001' } },
    device: {
      devicetype: 2, // desktop
      geo: { country: 'US' },
    },
  },
});

if (matchResult.matched) {
  console.log('Deal matched! PMP object:', matchResult.pmpObject);
} else {
  console.log('No match:', matchResult.reasons);
}
```

## Mock Data

The server seeds 5 realistic deals on startup:

| Deal Name | Format | Auction Type | Floor | Status |
|-----------|--------|--------------|-------|--------|
| Premium Video PMP - Acme Media | Video | First Price | $15.00 | - |
| Mobile Banner Deal - Beta Networks | Banner | Second Price | $2.50 | - |
| Audio Streaming Deal - Gamma Audio | Audio | Fixed Price | $8.00 | - |
| Native Content Deal - Delta Publishing | Native | First Price | €5.00 | Active |
| CTV Premium Deal - Epsilon Entertainment | Video (CTV) | First Price | $25.00 | Pending |

Use `dealsStore.reset()` to restore the original mock data.

## Testing

```bash
# Run tests for the deals-mcp-server package
npm test -w @agent-resolver/deals-mcp-server

# Run all tests
npm test
```

## Related Specifications

- [IAB Tech Lab Deals API v1.0](https://iabtechlab.com/standards/dealsapi/)
- [OpenRTB 2.6 Specification](https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md)
- [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)

## License

MIT
