# IAB Deals MCP Server - Usage Examples

This document provides practical examples for common use cases with the IAB Deals MCP Server.

## Table of Contents

- [Setup](#setup)
- [Basic Operations](#basic-operations)
  - [Listing Deals](#listing-deals)
  - [Creating a Deal](#creating-a-deal)
  - [Updating a Deal](#updating-a-deal)
- [Deal Lifecycle](#deal-lifecycle)
  - [Creating and Syncing a Deal](#creating-and-syncing-a-deal)
  - [Managing Deal Status](#managing-deal-status)
- [Bid Request Matching](#bid-request-matching)
  - [Video Campaign Match](#video-campaign-match)
  - [Mobile App Match](#mobile-app-match)
  - [Debugging No-Match Scenarios](#debugging-no-match-scenarios)
- [Deal Validation](#deal-validation)
- [Working with Resources](#working-with-resources)
- [Integration Patterns](#integration-patterns)
  - [Claude Desktop](#claude-desktop)
  - [Node.js Client](#nodejs-client)
  - [Python Client](#python-client)

---

## Setup

### Prerequisites

```bash
# Ensure Node.js 20+ is installed
node --version

# Install dependencies
npm install

# Build all packages
npm run build
```

### Starting the Server

```bash
# Start via CLI
npm run agent -- deals serve

# Or run directly
node packages/deals-mcp-server/dist/index.js
```

---

## Basic Operations

### Listing Deals

**List all deals:**
```json
{
  "tool": "deals_list",
  "arguments": {}
}
```

**Filter by video format:**
```json
{
  "tool": "deals_list",
  "arguments": {
    "filters": {
      "format": "video"
    }
  }
}
```

**Filter by active status and specific curator:**
```json
{
  "tool": "deals_list",
  "arguments": {
    "filters": {
      "status": "active",
      "curatorId": "cur-premium-001"
    }
  }
}
```

**Filter by publisher:**
```json
{
  "tool": "deals_list",
  "arguments": {
    "filters": {
      "publisherId": "pub-acme-001"
    }
  }
}
```

### Creating a Deal

**Minimal deal (banner, defaults):**
```json
{
  "tool": "deals_create",
  "arguments": {
    "deal": {
      "name": "Basic Banner Deal",
      "terms": {},
      "inventory": {
        "publisherIds": ["pub-123"],
        "formats": ["banner"]
      }
    }
  }
}
```

**Full-featured video deal:**
```json
{
  "tool": "deals_create",
  "arguments": {
    "deal": {
      "name": "Premium CTV Video Campaign Q1 2026",
      "terms": {
        "auctionType": "first-price",
        "bidFloor": 35.00,
        "bidFloorCurrency": "USD",
        "minCpmPerSec": 1.5,
        "guaranteedImpressions": 5000000,
        "startDate": "2026-01-01T00:00:00Z",
        "endDate": "2026-03-31T23:59:59Z"
      },
      "inventory": {
        "publisherIds": ["pub-streaming-001", "pub-streaming-002"],
        "formats": ["video"],
        "deviceTypes": ["ctv", "desktop"],
        "geoTargeting": {
          "countries": ["US", "CA", "GB"],
          "regions": ["CA", "NY", "TX", "FL"]
        }
      },
      "curation": {
        "curatorId": "cur-premium-video",
        "curatorName": "Premium Video Network",
        "packagerId": "pkg-q1-2026",
        "packagerName": "Q1 Campaign Packager",
        "sellerId": "seller-streaming",
        "sellerName": "Streaming Media Corp",
        "supplyChain": [
          { "asi": "streamingmedia.com", "sid": "pub-001", "hp": true },
          { "asi": "premiumvideo.net", "sid": "cur-001", "hp": false }
        ]
      },
      "buyerSeats": ["seat-agency-big", "seat-brand-major"],
      "advertiserDomains": ["automaker.com", "electronics-brand.com"]
    }
  }
}
```

**Audio deal with duration pricing:**
```json
{
  "tool": "deals_create",
  "arguments": {
    "deal": {
      "name": "Podcast Advertising Deal",
      "terms": {
        "auctionType": "fixed-price",
        "bidFloor": 12.00,
        "minCpmPerSec": 0.8
      },
      "inventory": {
        "publisherIds": ["pub-podcast-network"],
        "formats": ["audio"],
        "deviceTypes": ["mobile", "desktop"]
      },
      "curation": {
        "curatorId": "cur-audio-premium",
        "curatorName": "Audio Premium Network",
        "sellerId": "seller-podcast",
        "sellerName": "Podcast Network Inc"
      }
    }
  }
}
```

### Updating a Deal

**Update bid floor:**
```json
{
  "tool": "deals_update",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "updates": {
      "terms": {
        "bidFloor": 20.00
      }
    }
  }
}
```

**Add new buyer seats:**
```json
{
  "tool": "deals_update",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "updates": {
      "buyerSeats": ["seat-agency-1", "seat-agency-2", "seat-brand-x"]
    }
  }
}
```

**Update geo targeting:**
```json
{
  "tool": "deals_update",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "updates": {
      "inventory": {
        "geoTargeting": {
          "countries": ["US", "CA", "MX"],
          "regions": ["CA", "NY", "TX", "AZ"]
        }
      }
    }
  }
}
```

---

## Deal Lifecycle

### Creating and Syncing a Deal

This example shows the full lifecycle of creating a deal and syncing it to multiple DSPs.

**Step 1: Create the deal**
```json
{
  "tool": "deals_create",
  "arguments": {
    "deal": {
      "name": "Black Friday 2026 Video Campaign",
      "terms": {
        "auctionType": "first-price",
        "bidFloor": 25.00,
        "startDate": "2026-11-25T00:00:00Z",
        "endDate": "2026-11-30T23:59:59Z"
      },
      "inventory": {
        "publisherIds": ["pub-retail-001"],
        "formats": ["video", "banner"],
        "deviceTypes": ["desktop", "mobile", "tablet"]
      }
    }
  }
}
```

**Step 2: Sync to first DSP**
```json
{
  "tool": "deals_sync",
  "arguments": {
    "dealId": "deal-RETURNED_ID",
    "dspId": "dsp-thetradedesk",
    "dspName": "The Trade Desk"
  }
}
```

**Step 3: Sync to second DSP**
```json
{
  "tool": "deals_sync",
  "arguments": {
    "dealId": "deal-RETURNED_ID",
    "dspId": "dsp-dv360",
    "dspName": "Display & Video 360"
  }
}
```

### Managing Deal Status

**Activate a deal after buyer approval:**
```json
{
  "tool": "deals_update_status",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "status": "active",
    "comment": "Buyer approved - campaign launching Monday"
  }
}
```

**Pause a deal temporarily:**
```json
{
  "tool": "deals_update_status",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "status": "paused",
    "comment": "Budget cap reached - resuming next month"
  }
}
```

**Reject a deal:**
```json
{
  "tool": "deals_update_status",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "status": "rejected",
    "comment": "Floor price too high for this inventory"
  }
}
```

**Expire a deal:**
```json
{
  "tool": "deals_update_status",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "status": "expired",
    "comment": "Campaign end date reached"
  }
}
```

---

## Bid Request Matching

### Video Campaign Match

Testing if a CTV video bid request matches a deal:

```json
{
  "tool": "deals_match",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "bidRequest": {
      "id": "bid-request-001",
      "imp": [
        {
          "id": "imp-1",
          "video": {
            "mimes": ["video/mp4", "video/webm"]
          }
        }
      ],
      "site": {
        "id": "site-acme-news",
        "publisher": {
          "id": "pub-acme-001"
        }
      },
      "device": {
        "devicetype": 3,
        "geo": {
          "country": "US",
          "region": "CA"
        }
      },
      "user": {
        "buyeruid": "seat-advertiser-a"
      }
    }
  }
}
```

Expected response:
```json
{
  "dealId": "deal-m5k2j1-abc123",
  "matched": true,
  "reasons": ["All targeting criteria matched"],
  "pmpObject": {
    "private_auction": 1,
    "deals": [
      {
        "id": "deal-m5k2j1-abc123",
        "bidfloor": 15.0,
        "bidfloorcur": "USD",
        "wseat": ["seat-advertiser-a", "seat-advertiser-b"],
        "wadomain": ["brand-a.com", "brand-b.com"],
        "at": 1
      }
    ]
  }
}
```

### Mobile App Match

Testing a mobile app banner bid request:

```json
{
  "tool": "deals_match",
  "arguments": {
    "dealId": "deal-mobile-banner",
    "bidRequest": {
      "id": "bid-request-002",
      "imp": [
        {
          "id": "imp-1",
          "banner": {
            "w": 320,
            "h": 50
          }
        }
      ],
      "app": {
        "id": "app-beta-games",
        "publisher": {
          "id": "pub-beta-001"
        }
      },
      "device": {
        "devicetype": 1,
        "geo": {
          "country": "US",
          "region": "TX"
        }
      }
    }
  }
}
```

### Debugging No-Match Scenarios

When a bid request doesn't match, the response includes specific reasons:

```json
{
  "tool": "deals_match",
  "arguments": {
    "dealId": "deal-m5k2j1-abc123",
    "bidRequest": {
      "id": "bid-request-003",
      "imp": [
        {
          "id": "imp-1",
          "banner": { "w": 300, "h": 250 }
        }
      ],
      "site": {
        "publisher": { "id": "pub-wrong" }
      },
      "device": {
        "devicetype": 1,
        "geo": { "country": "FR" }
      }
    }
  }
}
```

Expected response:
```json
{
  "dealId": "deal-m5k2j1-abc123",
  "matched": false,
  "reasons": [
    "Publisher pub-wrong not in deal inventory [pub-acme-001]",
    "No matching format. Deal requires: video",
    "Device type mobile not in deal targeting [desktop, ctv]",
    "Country FR not in deal targeting [US, CA]"
  ]
}
```

---

## Deal Validation

**Validate a complete deal object:**
```json
{
  "tool": "deals_validate",
  "arguments": {
    "deal": {
      "id": "deal-test-001",
      "name": "Test Deal",
      "version": "1.0",
      "terms": {
        "auctionType": "first-price",
        "bidFloor": 10.0,
        "bidFloorCurrency": "USD"
      },
      "inventory": {
        "publisherIds": ["pub-test"],
        "formats": ["banner"]
      },
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  }
}
```

**Validate with intentional errors (for testing):**
```json
{
  "tool": "deals_validate",
  "arguments": {
    "deal": {
      "name": "",
      "terms": {
        "bidFloor": -5
      },
      "inventory": {
        "formats": ["unsupported-format"]
      }
    }
  }
}
```

---

## Working with Resources

### Reading the Deal Catalog

Access via MCP resource request:
```
URI: deals://catalog
```

### Getting the JSON Schema

Access via MCP resource request:
```
URI: deals://schema
```

Use this schema for client-side validation before submitting deals.

### OpenRTB PMP Template

Access via MCP resource request:
```
URI: deals://openrtb/pmp
```

Useful for understanding how to construct PMP objects in bid requests.

### Deal Statistics

Access via MCP resource request:
```
URI: deals://stats
```

Returns aggregated statistics for dashboards and monitoring.

---

## Integration Patterns

### Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json` (Linux) or equivalent:

```json
{
  "mcpServers": {
    "iab-deals": {
      "command": "node",
      "args": ["/absolute/path/to/packages/deals-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

Then restart Claude Desktop. You can now use natural language to interact with deals:

> "List all video deals with first-price auctions"
> "Create a new banner deal for mobile with a $5 floor"
> "Check if this bid request matches deal-abc123"

### Node.js Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function main() {
  // Spawn the server
  const serverProcess = spawn('node', [
    './packages/deals-mcp-server/dist/index.js'
  ]);

  // Create transport
  const transport = new StdioClientTransport({
    stdin: serverProcess.stdin,
    stdout: serverProcess.stdout,
  });

  // Create client
  const client = new Client({
    name: 'deals-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  await client.connect(transport);

  // List tools
  const tools = await client.listTools();
  console.log('Available tools:', tools.tools.map(t => t.name));

  // Call a tool
  const result = await client.callTool({
    name: 'deals_list',
    arguments: { filters: { format: 'video' } }
  });
  console.log('Video deals:', result);

  // Read a resource
  const catalog = await client.readResource({
    uri: 'deals://catalog'
  });
  console.log('Catalog:', catalog);

  // Cleanup
  await client.close();
  serverProcess.kill();
}

main().catch(console.error);
```

### Python Client

```python
import subprocess
import json

def call_mcp_tool(tool_name: str, arguments: dict) -> dict:
    """Call an MCP tool via the deals server."""
    # This is a simplified example - use the official MCP Python SDK
    # for production implementations

    process = subprocess.Popen(
        ['node', 'packages/deals-mcp-server/dist/index.js'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Send MCP request (simplified)
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }

    # ... handle MCP protocol communication

    return result

# Example usage
video_deals = call_mcp_tool('deals_list', {
    'filters': {'format': 'video'}
})
print(f"Found {video_deals['count']} video deals")
```

---

## Common Patterns

### Creating Multiple Related Deals

For campaigns with multiple ad formats:

```javascript
const formats = ['video', 'banner', 'native'];
const baseDeal = {
  terms: { bidFloor: 10.0 },
  inventory: {
    publisherIds: ['pub-campaign-001'],
    deviceTypes: ['desktop', 'mobile']
  }
};

for (const format of formats) {
  await client.callTool({
    name: 'deals_create',
    arguments: {
      deal: {
        ...baseDeal,
        name: `Q1 Campaign - ${format.toUpperCase()}`,
        inventory: {
          ...baseDeal.inventory,
          formats: [format]
        }
      }
    }
  });
}
```

### Bulk Status Updates

```javascript
const dealIds = ['deal-1', 'deal-2', 'deal-3'];

for (const dealId of dealIds) {
  await client.callTool({
    name: 'deals_update_status',
    arguments: {
      dealId,
      status: 'active',
      comment: 'Bulk activation - campaign launch'
    }
  });
}
```

### Testing Bid Request Variations

```javascript
const baseRequest = {
  id: 'test-request',
  imp: [{ id: 'imp-1', video: { mimes: ['video/mp4'] } }],
  site: { publisher: { id: 'pub-001' } }
};

const geoVariations = ['US', 'CA', 'GB', 'DE', 'FR'];

for (const country of geoVariations) {
  const result = await client.callTool({
    name: 'deals_match',
    arguments: {
      dealId: 'deal-test',
      bidRequest: {
        ...baseRequest,
        device: { geo: { country } }
      }
    }
  });

  console.log(`${country}: ${result.matched ? 'MATCH' : 'NO MATCH'}`);
}
```
