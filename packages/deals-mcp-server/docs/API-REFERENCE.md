# IAB Deals MCP Server - API Reference

This document provides a complete API reference for all tools and resources exposed by the IAB Deals MCP Server.

## Table of Contents

- [Tools](#tools)
  - [deals_list](#deals_list)
  - [deals_get](#deals_get)
  - [deals_create](#deals_create)
  - [deals_update](#deals_update)
  - [deals_sync](#deals_sync)
  - [deals_validate](#deals_validate)
  - [deals_match](#deals_match)
  - [deals_update_status](#deals_update_status)
- [Resources](#resources)
  - [deals://catalog](#dealscatalog)
  - [deals://schema](#dealsschema)
  - [deals://openrtb/pmp](#dealsopenrtbpmp)
  - [deals://stats](#dealsstats)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Tools

### deals_list

List all available deals with optional filtering capabilities.

#### Description

Returns a summarized list of deals from the store. Supports filtering by multiple criteria including status, format, buyer seat, curator, and publisher.

#### Input Schema

```typescript
{
  filters?: {
    status?: "pending" | "active" | "paused" | "rejected" | "expired";
    format?: "banner" | "video" | "audio" | "native";
    buyerSeat?: string;
    curatorId?: string;
    publisherId?: string;
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Filter criteria for the deal list |
| `filters.status` | enum | No | Filter by buyer status |
| `filters.format` | enum | No | Filter by inventory format |
| `filters.buyerSeat` | string | No | Filter by allowed buyer seat ID |
| `filters.curatorId` | string | No | Filter by curator ID |
| `filters.publisherId` | string | No | Filter by publisher ID |

#### Response

```typescript
{
  count: number;
  deals: Array<{
    id: string;
    name: string;
    version: string;
    status: string;
    bidFloor: number;
    currency: string;
    formats: string[];
    curator?: string;
  }>;
}
```

#### Example

**Request:**
```json
{
  "filters": {
    "format": "video",
    "status": "active"
  }
}
```

**Response:**
```json
{
  "count": 1,
  "deals": [
    {
      "id": "deal-m5k2j1-abc123",
      "name": "Premium Video PMP - Acme Media",
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

---

### deals_get

Retrieve detailed information about a specific deal.

#### Description

Returns the complete deal object including all terms, inventory targeting, curation information, and metadata.

#### Input Schema

```typescript
{
  dealId: string;  // Required
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dealId` | string | Yes | The unique identifier of the deal |

#### Response (Success)

```typescript
{
  deal: Deal;  // Complete deal object
}
```

#### Response (Not Found)

```typescript
{
  error: "Deal not found";
  dealId: string;
}
```

#### Example

**Request:**
```json
{
  "dealId": "deal-m5k2j1-abc123"
}
```

**Response:**
```json
{
  "deal": {
    "id": "deal-m5k2j1-abc123",
    "name": "Premium Video PMP - Acme Media",
    "version": "1.0",
    "buyerSeats": ["seat-advertiser-a", "seat-advertiser-b"],
    "advertiserDomains": ["brand-a.com", "brand-b.com"],
    "terms": {
      "auctionType": "first-price",
      "bidFloor": 15.0,
      "bidFloorCurrency": "USD",
      "startDate": "2026-01-01T00:00:00Z",
      "endDate": "2026-12-31T23:59:59Z"
    },
    "inventory": {
      "publisherIds": ["pub-acme-001"],
      "siteIds": ["site-acme-news"],
      "formats": ["video"],
      "deviceTypes": ["desktop", "ctv"],
      "geoTargeting": {
        "countries": ["US", "CA"]
      }
    },
    "curation": {
      "curatorId": "cur-premium-001",
      "curatorName": "Premium Curations Inc",
      "sellerId": "seller-acme",
      "sellerName": "Acme Media Group"
    },
    "createdAt": "2026-01-03T00:00:00.000Z",
    "updatedAt": "2026-01-03T00:00:00.000Z",
    "hash": "a1b2c3d4e5f6g7h8"
  }
}
```

---

### deals_create

Create a new programmatic deal.

#### Description

Creates a new deal with the provided configuration. The server automatically generates the deal ID, timestamps, and content hash.

#### Input Schema

```typescript
{
  deal: {
    name: string;                           // Required
    version?: string;                       // Default: "1.0"
    buyerSeats?: string[];
    advertiserDomains?: string[];
    terms: {
      auctionType?: "first-price" | "second-price" | "fixed-price";  // Default: "first-price"
      bidFloor?: number;                    // Default: 0
      bidFloorCurrency?: string;            // Default: "USD"
      minCpmPerSec?: number;
      guaranteedImpressions?: number;
      startDate?: string;                   // ISO 8601 datetime
      endDate?: string;                     // ISO 8601 datetime
    };
    inventory: {
      publisherIds: string[];               // Required, min 1
      siteIds?: string[];
      appIds?: string[];
      placementIds?: string[];
      formats: ("banner" | "video" | "audio" | "native")[];  // Required, min 1
      deviceTypes?: ("desktop" | "mobile" | "tablet" | "ctv")[];
      geoTargeting?: {
        countries?: string[];
        regions?: string[];
        cities?: string[];
      };
    };
    curation?: {
      curatorId: string;                    // Required if curation provided
      curatorName: string;                  // Required if curation provided
      packagerId?: string;
      packagerName?: string;
      sellerId: string;                     // Required if curation provided
      sellerName: string;                   // Required if curation provided
      supplyChain?: Array<{
        asi: string;
        sid: string;
        hp: boolean;
      }>;
    };
    buyerStatus?: {
      status: "pending" | "active" | "paused" | "rejected" | "expired";
      comment?: string;
      lastUpdated: string;                  // ISO 8601 datetime
      activatedAt?: string;                 // ISO 8601 datetime
    };
  };
}
```

#### Response (Success)

```typescript
{
  success: true;
  message: "Deal created successfully";
  deal: Deal;  // Complete created deal
}
```

#### Response (Error)

```typescript
{
  success: false;
  error: string;
}
```

#### Example

**Request:**
```json
{
  "deal": {
    "name": "Holiday Campaign PMP",
    "terms": {
      "auctionType": "first-price",
      "bidFloor": 20.0,
      "bidFloorCurrency": "USD",
      "startDate": "2026-12-01T00:00:00Z",
      "endDate": "2026-12-31T23:59:59Z"
    },
    "inventory": {
      "publisherIds": ["pub-holiday-001"],
      "formats": ["video", "banner"],
      "deviceTypes": ["desktop", "mobile", "ctv"],
      "geoTargeting": {
        "countries": ["US"]
      }
    },
    "curation": {
      "curatorId": "cur-seasonal",
      "curatorName": "Seasonal Curations",
      "sellerId": "seller-holiday",
      "sellerName": "Holiday Media Network"
    },
    "buyerSeats": ["seat-brand-x"]
  }
}
```

---

### deals_update

Update an existing deal.

#### Description

Partially updates a deal with the provided fields. Only specified fields are updated; others remain unchanged.

#### Input Schema

```typescript
{
  dealId: string;  // Required
  updates: {
    name?: string;
    version?: string;
    buyerSeats?: string[];
    advertiserDomains?: string[];
    terms?: Partial<DealTerms>;
    inventory?: Partial<InventoryInfo>;
    curation?: CurationInfo;
    buyerStatus?: BuyerStatus;
  };
}
```

#### Response (Success)

```typescript
{
  success: true;
  message: "Deal updated successfully";
  deal: Deal;
}
```

#### Response (Not Found)

```typescript
{
  success: false;
  error: "Deal not found";
  dealId: string;
}
```

#### Notes

- The `id` and `createdAt` fields cannot be modified
- The `updatedAt` field is automatically set to the current time
- The `hash` is recalculated after update

---

### deals_sync

Simulate syncing a deal to a DSP.

#### Description

Simulates the IAB Deals API sync functionality. In production, this would push deal information to a receiving DSP system. This mock implementation updates the deal's buyer status to "pending" and returns a sync confirmation.

#### Input Schema

```typescript
{
  dealId: string;   // Required
  dspId: string;    // Required
  dspName?: string; // Optional, for logging
}
```

#### Response (Success)

```typescript
{
  success: true;
  dealId: string;
  dspId: string;
  syncedAt: string;  // ISO 8601 datetime
  status: "pending";
  message: string;
}
```

#### Response (Not Found)

```typescript
{
  success: false;
  error: "Deal not found";
  dealId: string;
  dspId: string;
}
```

#### Example

**Request:**
```json
{
  "dealId": "deal-m5k2j1-abc123",
  "dspId": "dsp-ttd",
  "dspName": "The Trade Desk"
}
```

**Response:**
```json
{
  "success": true,
  "dealId": "deal-m5k2j1-abc123",
  "dspId": "dsp-ttd",
  "syncedAt": "2026-01-03T12:00:00.000Z",
  "status": "pending",
  "message": "Deal \"Premium Video PMP - Acme Media\" successfully synced to DSP The Trade Desk. Awaiting buyer confirmation."
}
```

---

### deals_validate

Validate a deal object against the schema.

#### Description

Validates any object against the Deal schema, returning detailed validation errors if the object is invalid.

#### Input Schema

```typescript
{
  deal: unknown;  // Any object to validate
}
```

#### Response (Valid)

```typescript
{
  valid: true;
  message: "Deal is valid";
  deal: Deal;  // Parsed and validated deal
}
```

#### Response (Invalid)

```typescript
{
  valid: false;
  errors: Array<{
    path: string;     // Dot-notation path to the error
    message: string;  // Human-readable error message
    code: string;     // Zod error code
  }>;
}
```

#### Example (Invalid Input)

**Request:**
```json
{
  "deal": {
    "id": "test",
    "name": "Test Deal",
    "terms": {
      "bidFloor": "not-a-number"
    }
  }
}
```

**Response:**
```json
{
  "valid": false,
  "errors": [
    {
      "path": "terms.bidFloor",
      "message": "Expected number, received string",
      "code": "invalid_type"
    },
    {
      "path": "inventory",
      "message": "Required",
      "code": "invalid_type"
    },
    {
      "path": "createdAt",
      "message": "Required",
      "code": "invalid_type"
    },
    {
      "path": "updatedAt",
      "message": "Required",
      "code": "invalid_type"
    }
  ]
}
```

---

### deals_match

Check if a bid request matches a deal's targeting criteria.

#### Description

Evaluates an OpenRTB-style bid request against a deal's targeting criteria. Returns a detailed match result including reasons for match/no-match and an optional PMP object for matched deals.

#### Input Schema

```typescript
{
  dealId: string;  // Required
  bidRequest: {
    id: string;
    imp: Array<{
      id: string;
      banner?: { w: number; h: number };
      video?: { mimes: string[] };
      audio?: { mimes: string[] };
      native?: {};
      pmp?: PmpObject;
    }>;
    site?: {
      id?: string;
      publisher?: { id: string };
    };
    app?: {
      id?: string;
      publisher?: { id: string };
    };
    device?: {
      devicetype?: number;  // OpenRTB device type
      geo?: {
        country?: string;
        region?: string;
        city?: string;
      };
    };
    user?: {
      buyeruid?: string;
    };
  };
}
```

#### Device Type Mapping

| OpenRTB Value | Device Type |
|---------------|-------------|
| 1 | mobile |
| 2 | desktop |
| 3 | ctv |
| 4 | mobile |
| 5 | tablet |
| 6, 7 | ctv |

#### Matching Criteria

The following criteria are evaluated:

1. **Publisher ID**: Bid request publisher must be in deal's `inventory.publisherIds`
2. **Site/App ID**: If specified in deal, bid request site/app must match
3. **Format**: Bid request impression format must match deal's `inventory.formats`
4. **Device Type**: Bid request device type must be in deal's `inventory.deviceTypes`
5. **Geo Targeting**: Country/region/city must match deal's `inventory.geoTargeting`
6. **Buyer Seat**: User's buyer ID must be in deal's `buyerSeats`

#### Response

```typescript
{
  dealId: string;
  matched: boolean;
  reasons: string[];  // Explanation of match/no-match
  pmpObject?: {       // Only present if matched
    private_auction: 0 | 1;
    deals: Array<{
      id: string;
      bidfloor?: number;
      bidfloorcur?: string;
      wseat?: string[];
      wadomain?: string[];
      at?: number;
    }>;
  };
}
```

---

### deals_update_status

Update the buyer status of a deal.

#### Description

Changes a deal's buyer status and optionally adds a comment. Automatically sets `activatedAt` when status changes to "active".

#### Input Schema

```typescript
{
  dealId: string;   // Required
  status: "pending" | "active" | "paused" | "rejected" | "expired";  // Required
  comment?: string;
}
```

#### Response (Success)

```typescript
{
  success: true;
  message: string;
  deal: {
    id: string;
    name: string;
    buyerStatus: BuyerStatus;
  };
}
```

#### Response (Not Found)

```typescript
{
  success: false;
  error: "Deal not found";
  dealId: string;
}
```

---

## Resources

### deals://catalog

Returns a complete catalog of all available deals in a summarized format.

#### MIME Type

`application/json`

#### Response Structure

```typescript
{
  version: "1.0";
  generatedAt: string;  // ISO 8601 datetime
  totalDeals: number;
  deals: Array<{
    id: string;
    name: string;
    version: string;
    status: string;
    terms: {
      auctionType: string;
      bidFloor: number;
      currency: string;
    };
    inventory: {
      formats: string[];
      publishers: string[];
      deviceTypes?: string[];
    };
    curator: { id: string; name: string } | null;
    seller: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

---

### deals://schema

Returns the JSON Schema for deal validation.

#### MIME Type

`application/schema+json`

#### Description

Provides a JSON Schema (draft-07) representation of the Deal object, useful for client-side validation and documentation generation.

---

### deals://openrtb/pmp

Returns a template and documentation for OpenRTB 2.6 PMP objects.

#### MIME Type

`application/json`

#### Description

Provides a template showing the structure of OpenRTB Private Marketplace objects, including field descriptions and an example.

---

### deals://stats

Returns aggregated statistics about available deals.

#### MIME Type

`application/json`

#### Response Structure

```typescript
{
  generatedAt: string;
  total: number;
  byStatus: {
    pending: number;
    active: number;
    paused: number;
    rejected: number;
    expired: number;
    noStatus: number;
  };
  byFormat: {
    banner: number;
    video: number;
    audio: number;
    native: number;
  };
  byAuctionType: {
    "first-price": number;
    "second-price": number;
    "fixed-price": number;
  };
  averageBidFloor: number;
  currencies: string[];
  curatedDeals: number;
}
```

---

## Error Handling

All tools return structured error responses:

```typescript
{
  success?: false;
  error: string;
  // Additional context fields may be present
}
```

Common error scenarios:

| Error | Description |
|-------|-------------|
| "Deal not found" | The specified `dealId` doesn't exist |
| "Invalid JSON" | Request body is not valid JSON |
| "Invalid request" | Request doesn't match the input schema |
| Schema validation errors | Detailed Zod validation errors |

---

## Rate Limiting

The mock server does not implement rate limiting, but the MCP index entry specifies:

```json
{
  "policy": {
    "rateLimitPerMin": 1000
  }
}
```

Production implementations should respect this limit.
