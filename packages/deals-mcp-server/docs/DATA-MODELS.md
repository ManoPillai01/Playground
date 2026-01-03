# IAB Deals MCP Server - Data Models Reference

This document provides a complete reference for all data models used by the IAB Deals MCP Server, including their relationship to IAB Tech Lab specifications.

## Table of Contents

- [Overview](#overview)
- [Core Models](#core-models)
  - [Deal](#deal)
  - [DealTerms](#dealterms)
  - [InventoryInfo](#inventoryinfo)
  - [CurationInfo](#curationinfo)
  - [BuyerStatus](#buyerstatus)
- [Input Models](#input-models)
  - [DealCreateInput](#dealcreateinput)
  - [DealUpdateInput](#dealupdateinput)
  - [DealFilter](#dealfilter)
- [OpenRTB Models](#openrtb-models)
  - [PmpObject](#pmpobject)
  - [SimpleBidRequest](#simplebidrequest)
- [Response Models](#response-models)
  - [DealSyncResponse](#dealsyncresponse)
  - [DealMatchResult](#dealmatchresult)
- [Enumerations](#enumerations)
- [Specification Mapping](#specification-mapping)

---

## Overview

The data models in this server are designed to be compatible with:

1. **IAB Tech Lab Deals API v1.0** - For deal metadata and sync functionality
2. **OpenRTB 2.6** - For bid request/response compatibility
3. **Model Context Protocol** - For tool and resource schemas

All models are defined using [Zod](https://zod.dev/) for runtime validation and TypeScript type inference.

---

## Core Models

### Deal

The main deal object representing a programmatic advertising deal.

```typescript
interface Deal {
  // === Core Identification ===
  id: string;
  // Unique identifier for the deal
  // Generated automatically using timestamp + random suffix
  // Format: "deal-{base36-timestamp}-{random}"

  name: string;
  // Human-readable name for the deal
  // Minimum 1 character

  version: string;
  // Deal version string
  // Default: "1.0"

  // === Parties (OpenRTB 2.6) ===
  buyerSeats?: string[];
  // Array of buyer seat IDs allowed to bid on this deal
  // Maps to OpenRTB 2.6 deal.wseat

  advertiserDomains?: string[];
  // Array of advertiser domains allowed for this deal
  // Maps to OpenRTB 2.6 deal.wadomain

  // === Terms ===
  terms: DealTerms;
  // Deal pricing and timing terms
  // See DealTerms model

  // === Inventory Targeting ===
  inventory: InventoryInfo;
  // Inventory targeting configuration
  // See InventoryInfo model

  // === Curation (IAB Deals API) ===
  curation?: CurationInfo;
  // Curation and supply chain information
  // See CurationInfo model

  // === Buyer Status ===
  buyerStatus?: BuyerStatus;
  // Current status from buyer perspective
  // See BuyerStatus model

  // === Metadata ===
  createdAt: string;
  // ISO 8601 datetime when deal was created

  updatedAt: string;
  // ISO 8601 datetime when deal was last updated

  hash?: string;
  // Deterministic content hash (SHA-256, first 16 chars)
  // Generated from: id, name, version, terms, inventory, curation
}
```

**Zod Schema Location:** `packages/schema/src/deals.ts`

---

### DealTerms

Pricing and timing terms for a deal.

```typescript
interface DealTerms {
  auctionType: "first-price" | "second-price" | "fixed-price";
  // Auction type for this deal
  // - first-price: Winner pays their bid (at=1 in OpenRTB)
  // - second-price: Winner pays second highest bid + $0.01 (at=2)
  // - fixed-price: Fixed CPM rate
  // Default: "first-price"

  bidFloor: number;
  // Minimum bid for this impression expressed in CPM
  // Maps to OpenRTB 2.6 deal.bidfloor
  // Minimum: 0
  // Default: 0

  bidFloorCurrency: string;
  // Currency for bidFloor (ISO-4217 alpha code)
  // Maps to OpenRTB 2.6 deal.bidfloorcur
  // Must be exactly 3 characters
  // Default: "USD"

  minCpmPerSec?: number;
  // Minimum CPM per second of ad duration
  // Used for audio/video deals with duration-based pricing
  // Maps to OpenRTB 2.6 deal.mincpmpersec
  // Minimum: 0

  guaranteedImpressions?: number;
  // Number of guaranteed impressions for this deal
  // Used for guaranteed/programmatic guaranteed deals
  // Must be a positive integer

  startDate?: string;
  // Deal start date (ISO 8601 datetime)
  // Deal is not active before this date

  endDate?: string;
  // Deal end date (ISO 8601 datetime)
  // Deal expires after this date
}
```

---

### InventoryInfo

Inventory targeting configuration for a deal.

```typescript
interface InventoryInfo {
  publisherIds: string[];
  // Array of publisher IDs whose inventory is included
  // Required, minimum 1 entry
  // Each entry must be non-empty

  siteIds?: string[];
  // Array of specific site IDs (for web inventory)
  // If empty, all sites from the publishers are included

  appIds?: string[];
  // Array of specific app IDs (for mobile app inventory)
  // If empty, all apps from the publishers are included

  placementIds?: string[];
  // Array of specific placement IDs
  // For granular targeting within sites/apps

  formats: InventoryFormat[];
  // Array of ad formats included in this deal
  // Required, minimum 1 entry
  // Values: "banner" | "video" | "audio" | "native"

  deviceTypes?: DeviceType[];
  // Array of device types included
  // Values: "desktop" | "mobile" | "tablet" | "ctv"
  // If empty, all device types are included

  geoTargeting?: GeoTargeting;
  // Geographic targeting constraints
  // See GeoTargeting type
}

interface GeoTargeting {
  countries?: string[];
  // ISO 3166-1 alpha-2 country codes
  // Example: ["US", "CA", "GB"]

  regions?: string[];
  // Region/state codes
  // Format varies by country (e.g., "CA", "NY" for US states)

  cities?: string[];
  // City names
  // Example: ["New York", "Los Angeles"]
}
```

---

### CurationInfo

Curation and supply chain information for curated deals (IAB Deals API v1.0).

```typescript
interface CurationInfo {
  curatorId: string;
  // Unique identifier for the curator
  // Required, minimum 1 character

  curatorName: string;
  // Human-readable curator name
  // Required, minimum 1 character

  packagerId?: string;
  // Identifier for the packager (if different from curator)
  // A packager assembles inventory from multiple sellers

  packagerName?: string;
  // Human-readable packager name

  sellerId: string;
  // Identifier for the seller/SSP
  // Required, minimum 1 character

  sellerName: string;
  // Human-readable seller name
  // Required, minimum 1 character

  supplyChain?: SupplyChainNode[];
  // Supply chain transparency nodes
  // See SupplyChainNode type
}

interface SupplyChainNode {
  asi: string;
  // Advertising System Identifier (domain)
  // Example: "publisher.com", "ssp.net"

  sid: string;
  // Seller ID within the advertising system

  hp: boolean;
  // Whether this node was involved in the decision to place the ad
  // true = directly involved, false = passthrough
}
```

---

### BuyerStatus

Status of the deal from the buyer's perspective.

```typescript
interface BuyerStatus {
  status: DealStatusType;
  // Current status of the deal
  // Values: "pending" | "active" | "paused" | "rejected" | "expired"

  comment?: string;
  // Optional comment about the status
  // Example: "Awaiting creative approval"

  lastUpdated: string;
  // ISO 8601 datetime of last status change

  activatedAt?: string;
  // ISO 8601 datetime when deal was activated
  // Only set when status is or was "active"
}
```

**Status Workflow:**

```
         ┌──────────┐
         │ pending  │ ◄── Initial state after sync
         └────┬─────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌──────────┐
│active │ │paused │ │ rejected │
└───┬───┘ └───┬───┘ └──────────┘
    │         │
    ├─────────┤
    ▼         ▼
┌─────────────────┐
│    expired      │
└─────────────────┘
```

---

## Input Models

### DealCreateInput

Input schema for creating a new deal.

```typescript
interface DealCreateInput {
  name: string;              // Required
  version?: string;          // Optional, default: "1.0"
  buyerSeats?: string[];
  advertiserDomains?: string[];
  terms: DealTermsInput;     // All fields optional (have defaults)
  inventory: InventoryInfo;  // Required
  curation?: CurationInfo;
  buyerStatus?: BuyerStatus;
}

interface DealTermsInput {
  auctionType?: AuctionType;       // Default: "first-price"
  bidFloor?: number;               // Default: 0
  bidFloorCurrency?: string;       // Default: "USD"
  minCpmPerSec?: number;
  guaranteedImpressions?: number;
  startDate?: string;
  endDate?: string;
}
```

**Note:** The following fields are auto-generated and cannot be set:
- `id` - Generated by the server
- `createdAt` - Set to current time
- `updatedAt` - Set to current time
- `hash` - Computed from content

---

### DealUpdateInput

Input schema for updating an existing deal.

```typescript
interface DealUpdateInput {
  name?: string;
  version?: string;
  buyerSeats?: string[];
  advertiserDomains?: string[];
  terms?: Partial<DealTermsInput>;
  inventory?: Partial<InventoryInfo>;
  curation?: CurationInfo;
  buyerStatus?: BuyerStatus;
}
```

**Note:** The following fields cannot be modified:
- `id` - Immutable
- `createdAt` - Immutable

The `updatedAt` field is automatically set to the current time on update.

---

### DealFilter

Filter criteria for listing deals.

```typescript
interface DealFilter {
  status?: DealStatusType;
  // Filter by buyer status
  // Deals without buyerStatus are excluded

  format?: InventoryFormat;
  // Filter by inventory format
  // Matches if deal includes this format

  buyerSeat?: string;
  // Filter by allowed buyer seat
  // Matches if buyerSeats includes this value

  curatorId?: string;
  // Filter by curator ID
  // Deals without curation are excluded

  publisherId?: string;
  // Filter by publisher ID
  // Matches if publisherIds includes this value
}
```

---

## OpenRTB Models

### PmpObject

Private Marketplace object compatible with OpenRTB 2.6.

```typescript
interface PmpObject {
  private_auction: 0 | 1;
  // 0 = All bids accepted
  // 1 = Bids restricted to specified deals
  // Default: 0

  deals: Array<{
    id: string;
    // Deal identifier (matches Deal.id)

    bidfloor?: number;
    // Minimum bid (CPM)

    bidfloorcur?: string;
    // Floor currency (ISO-4217)

    wseat?: string[];
    // Allowed buyer seats

    wadomain?: string[];
    // Allowed advertiser domains

    at?: number;
    // Auction type override
    // 1 = first price, 2 = second price
  }>;
}
```

---

### SimpleBidRequest

Simplified bid request for deal matching.

```typescript
interface SimpleBidRequest {
  id: string;
  // Bid request ID

  imp: Array<{
    id: string;
    // Impression ID

    banner?: { w: number; h: number };
    // Banner impression with dimensions

    video?: { mimes: string[] };
    // Video impression with MIME types

    audio?: { mimes: string[] };
    // Audio impression with MIME types

    native?: {};
    // Native impression

    pmp?: PmpObject;
    // Private marketplace info
  }>;

  site?: {
    id?: string;
    // Site identifier

    publisher?: { id: string };
    // Publisher identifier
  };

  app?: {
    id?: string;
    // App identifier

    publisher?: { id: string };
    // Publisher identifier
  };

  device?: {
    devicetype?: number;
    // OpenRTB device type code
    // 1=mobile, 2=desktop, 3=ctv, 4=phone, 5=tablet, 6=connected device, 7=set top box

    geo?: {
      country?: string;
      region?: string;
      city?: string;
    };
  };

  user?: {
    buyeruid?: string;
    // Buyer-specific user ID (maps to seat)
  };
}
```

---

## Response Models

### DealSyncResponse

Response from the deals_sync tool.

```typescript
interface DealSyncResponse {
  success: boolean;
  // Whether the sync operation succeeded

  dealId: string;
  // ID of the synced deal

  dspId: string;
  // ID of the target DSP

  syncedAt: string;
  // ISO 8601 datetime of sync

  status: DealStatusType;
  // New status (typically "pending")

  message?: string;
  // Human-readable result message
}
```

---

### DealMatchResult

Result from the deals_match tool.

```typescript
interface DealMatchResult {
  dealId: string;
  // ID of the deal tested

  matched: boolean;
  // Whether the bid request matched all criteria

  reasons: string[];
  // Explanation of match/no-match
  // For matches: ["All targeting criteria matched"]
  // For no-match: List of failed criteria

  pmpObject?: PmpObject;
  // PMP object to include in bid response
  // Only present if matched=true
}
```

---

## Enumerations

### AuctionType

```typescript
type AuctionType = "first-price" | "second-price" | "fixed-price";
```

| Value | Description | OpenRTB `at` |
|-------|-------------|--------------|
| `first-price` | Winner pays their bid | 1 |
| `second-price` | Winner pays second-highest + $0.01 | 2 |
| `fixed-price` | Fixed CPM rate | N/A |

### InventoryFormat

```typescript
type InventoryFormat = "banner" | "video" | "audio" | "native";
```

| Value | Description | OpenRTB Imp Field |
|-------|-------------|-------------------|
| `banner` | Display banner ads | `imp.banner` |
| `video` | Video ads (instream, outstream) | `imp.video` |
| `audio` | Audio ads (streaming, podcast) | `imp.audio` |
| `native` | Native ads | `imp.native` |

### DeviceType

```typescript
type DeviceType = "desktop" | "mobile" | "tablet" | "ctv";
```

| Value | OpenRTB devicetype |
|-------|-------------------|
| `desktop` | 2 |
| `mobile` | 1, 4 |
| `tablet` | 5 |
| `ctv` | 3, 6, 7 |

### DealStatusType

```typescript
type DealStatusType = "pending" | "active" | "paused" | "rejected" | "expired";
```

| Status | Description |
|--------|-------------|
| `pending` | Deal synced, awaiting buyer action |
| `active` | Deal is live and accepting bids |
| `paused` | Deal temporarily suspended |
| `rejected` | Buyer declined the deal |
| `expired` | Deal has passed its end date |

---

## Specification Mapping

### IAB Deals API v1.0 Mapping

| Deals API Concept | This Implementation |
|-------------------|---------------------|
| Deal Object | `Deal` |
| Deal Terms | `DealTerms` |
| Inventory Details | `InventoryInfo` |
| Curation Information | `CurationInfo` |
| Buyer Status | `BuyerStatus` |
| Deal Sync Push | `deals_sync` tool |

### OpenRTB 2.6 Mapping

| OpenRTB Object/Field | This Implementation |
|---------------------|---------------------|
| `pmp` object | `PmpObject` |
| `deal.id` | `Deal.id` |
| `deal.bidfloor` | `DealTerms.bidFloor` |
| `deal.bidfloorcur` | `DealTerms.bidFloorCurrency` |
| `deal.wseat` | `Deal.buyerSeats` |
| `deal.wadomain` | `Deal.advertiserDomains` |
| `deal.at` | Derived from `DealTerms.auctionType` |
| `deal.mincpmpersec` | `DealTerms.minCpmPerSec` |

---

## Schema Validation

All models are validated at runtime using Zod. Validation errors include:

```typescript
interface ValidationError {
  path: string;     // Dot-notation path to error
  message: string;  // Human-readable message
  code: string;     // Zod error code
}
```

Common validation codes:
- `invalid_type` - Wrong data type
- `too_small` - Below minimum length/value
- `too_big` - Above maximum length/value
- `invalid_enum_value` - Not in allowed values
- `invalid_string` - String format error (e.g., datetime)
