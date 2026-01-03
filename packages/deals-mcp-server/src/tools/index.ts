import { z } from 'zod';
import {
  Deal,
  DealCreateInput,
  DealUpdateInput,
  DealFilter,
  DealSyncRequest,
  DealSyncResponse,
  SimpleBidRequest,
  DealMatchResult,
  PmpObject,
  DealStatusType,
} from '@agent-resolver/schema';
import { dealsStore } from '../store/deals-store.js';

/**
 * Tool definitions for the Deals MCP Server
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (args: unknown) => Promise<unknown>;
}

/**
 * List all deals with optional filtering
 */
export const listDeals: ToolDefinition = {
  name: 'deals_list',
  description:
    'List all available deals. Optionally filter by status, format, buyer seat, curator ID, or publisher ID.',
  inputSchema: z.object({
    filters: DealFilter.optional(),
  }),
  handler: async (args) => {
    const { filters } = args as { filters?: DealFilter };
    const deals = dealsStore.list(filters);
    return {
      count: deals.length,
      deals: deals.map((d) => ({
        id: d.id,
        name: d.name,
        version: d.version,
        status: d.buyerStatus?.status ?? 'pending',
        bidFloor: d.terms.bidFloor,
        currency: d.terms.bidFloorCurrency,
        formats: d.inventory.formats,
        curator: d.curation?.curatorName,
      })),
    };
  },
};

/**
 * Get a specific deal by ID
 */
export const getDeal: ToolDefinition = {
  name: 'deals_get',
  description: 'Get detailed information about a specific deal by its ID.',
  inputSchema: z.object({
    dealId: z.string().min(1).describe('The unique deal identifier'),
  }),
  handler: async (args) => {
    const { dealId } = args as { dealId: string };
    const deal = dealsStore.get(dealId);

    if (!deal) {
      return {
        error: 'Deal not found',
        dealId,
      };
    }

    return { deal };
  },
};

/**
 * Create a new deal
 */
export const createDeal: ToolDefinition = {
  name: 'deals_create',
  description:
    'Create a new programmatic deal. Requires name, terms, and inventory information.',
  inputSchema: z.object({
    deal: DealCreateInput,
  }),
  handler: async (args) => {
    const { deal: input } = args as { deal: DealCreateInput };

    try {
      const deal = dealsStore.create(input);
      return {
        success: true,
        message: 'Deal created successfully',
        deal,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create deal',
      };
    }
  },
};

/**
 * Update an existing deal
 */
export const updateDeal: ToolDefinition = {
  name: 'deals_update',
  description: 'Update an existing deal. Only provided fields will be updated.',
  inputSchema: z.object({
    dealId: z.string().min(1).describe('The deal ID to update'),
    updates: DealUpdateInput,
  }),
  handler: async (args) => {
    const { dealId, updates } = args as { dealId: string; updates: DealUpdateInput };

    const deal = dealsStore.update(dealId, updates);

    if (!deal) {
      return {
        success: false,
        error: 'Deal not found',
        dealId,
      };
    }

    return {
      success: true,
      message: 'Deal updated successfully',
      deal,
    };
  },
};

/**
 * Simulate syncing a deal to a DSP
 */
export const syncDeal: ToolDefinition = {
  name: 'deals_sync',
  description:
    'Simulate syncing a deal to a DSP (Demand-Side Platform). This is a mock operation that simulates the IAB Deals API sync functionality.',
  inputSchema: z.object({
    dealId: z.string().min(1).describe('The deal ID to sync'),
    dspId: z.string().min(1).describe('The target DSP identifier'),
    dspName: z.string().optional().describe('Optional DSP name for logging'),
  }),
  handler: async (args) => {
    const { dealId, dspId, dspName } = args as DealSyncRequest;

    const deal = dealsStore.get(dealId);

    if (!deal) {
      return {
        success: false,
        error: 'Deal not found',
        dealId,
        dspId,
      };
    }

    // Simulate sync process
    const syncResponse: DealSyncResponse = {
      success: true,
      dealId,
      dspId,
      syncedAt: new Date().toISOString(),
      status: 'pending',
      message: `Deal "${deal.name}" successfully synced to DSP ${dspName ?? dspId}. Awaiting buyer confirmation.`,
    };

    // Update deal status to reflect sync
    dealsStore.updateStatus(dealId, 'pending', `Synced to ${dspName ?? dspId}`);

    return syncResponse;
  },
};

/**
 * Validate a deal against the schema
 */
export const validateDeal: ToolDefinition = {
  name: 'deals_validate',
  description:
    'Validate a deal object against the IAB Deals API schema. Returns validation errors if any.',
  inputSchema: z.object({
    deal: z.unknown().describe('The deal object to validate'),
  }),
  handler: async (args) => {
    const { deal } = args as { deal: unknown };

    const result = Deal.safeParse(deal);

    if (result.success) {
      return {
        valid: true,
        message: 'Deal is valid',
        deal: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    };
  },
};

/**
 * Check if a bid request matches a deal
 */
export const matchDeal: ToolDefinition = {
  name: 'deals_match',
  description:
    'Check if a bid request matches the targeting criteria of a specific deal. Returns match result with reasons.',
  inputSchema: z.object({
    dealId: z.string().min(1).describe('The deal ID to match against'),
    bidRequest: SimpleBidRequest.describe('The OpenRTB bid request to match'),
  }),
  handler: async (args) => {
    const { dealId, bidRequest } = args as {
      dealId: string;
      bidRequest: z.infer<typeof SimpleBidRequest>;
    };

    const deal = dealsStore.get(dealId);

    if (!deal) {
      return {
        dealId,
        matched: false,
        reasons: ['Deal not found'],
      };
    }

    const reasons: string[] = [];
    let matched = true;

    // Check publisher ID
    const publisherId =
      bidRequest.site?.publisher?.id ?? bidRequest.app?.publisher?.id;
    if (publisherId && !deal.inventory.publisherIds.includes(publisherId)) {
      matched = false;
      reasons.push(
        `Publisher ${publisherId} not in deal inventory [${deal.inventory.publisherIds.join(', ')}]`
      );
    }

    // Check site/app ID
    const siteId = bidRequest.site?.id;
    const appId = bidRequest.app?.id;
    if (siteId && deal.inventory.siteIds && !deal.inventory.siteIds.includes(siteId)) {
      matched = false;
      reasons.push(`Site ${siteId} not in deal inventory`);
    }
    if (appId && deal.inventory.appIds && !deal.inventory.appIds.includes(appId)) {
      matched = false;
      reasons.push(`App ${appId} not in deal inventory`);
    }

    // Check format
    const hasFormat = bidRequest.imp.some((imp) => {
      if (imp.banner && deal.inventory.formats.includes('banner')) return true;
      if (imp.video && deal.inventory.formats.includes('video')) return true;
      if (imp.audio && deal.inventory.formats.includes('audio')) return true;
      if (imp.native && deal.inventory.formats.includes('native')) return true;
      return false;
    });
    if (!hasFormat) {
      matched = false;
      reasons.push(
        `No matching format. Deal requires: ${deal.inventory.formats.join(', ')}`
      );
    }

    // Check device type
    if (deal.inventory.deviceTypes && bidRequest.device?.devicetype) {
      const deviceTypeMap: Record<number, string> = {
        1: 'mobile',
        2: 'desktop',
        3: 'ctv',
        4: 'mobile',
        5: 'tablet',
        6: 'ctv',
        7: 'ctv',
      };
      const deviceType = deviceTypeMap[bidRequest.device.devicetype];
      if (deviceType && !deal.inventory.deviceTypes.includes(deviceType as any)) {
        matched = false;
        reasons.push(
          `Device type ${deviceType} not in deal targeting [${deal.inventory.deviceTypes.join(', ')}]`
        );
      }
    }

    // Check geo targeting
    if (deal.inventory.geoTargeting && bidRequest.device?.geo) {
      const geo = bidRequest.device.geo;
      if (
        geo.country &&
        deal.inventory.geoTargeting.countries &&
        !deal.inventory.geoTargeting.countries.includes(geo.country)
      ) {
        matched = false;
        reasons.push(
          `Country ${geo.country} not in deal targeting [${deal.inventory.geoTargeting.countries.join(', ')}]`
        );
      }
      if (
        geo.region &&
        deal.inventory.geoTargeting.regions &&
        !deal.inventory.geoTargeting.regions.includes(geo.region)
      ) {
        matched = false;
        reasons.push(`Region ${geo.region} not in deal targeting`);
      }
    }

    // Check buyer seat
    if (deal.buyerSeats && bidRequest.user?.buyeruid) {
      if (!deal.buyerSeats.includes(bidRequest.user.buyeruid)) {
        matched = false;
        reasons.push(`Buyer seat ${bidRequest.user.buyeruid} not allowed for this deal`);
      }
    }

    // Generate PMP object if matched
    let pmpObject: PmpObject | undefined;
    if (matched) {
      pmpObject = {
        private_auction: 1,
        deals: [
          {
            id: deal.id,
            bidfloor: deal.terms.bidFloor,
            bidfloorcur: deal.terms.bidFloorCurrency,
            wseat: deal.buyerSeats,
            wadomain: deal.advertiserDomains,
            at: deal.terms.auctionType === 'first-price' ? 1 : 2,
          },
        ],
      };
      reasons.push('All targeting criteria matched');
    }

    const result: DealMatchResult = {
      dealId,
      matched,
      reasons,
      pmpObject,
    };

    return result;
  },
};

/**
 * Update deal status
 */
export const updateDealStatus: ToolDefinition = {
  name: 'deals_update_status',
  description:
    'Update the buyer status of a deal. Use this to activate, pause, reject, or expire a deal.',
  inputSchema: z.object({
    dealId: z.string().min(1).describe('The deal ID to update'),
    status: DealStatusType.describe('The new status'),
    comment: z.string().optional().describe('Optional comment about the status change'),
  }),
  handler: async (args) => {
    const { dealId, status, comment } = args as {
      dealId: string;
      status: z.infer<typeof DealStatusType>;
      comment?: string;
    };

    const deal = dealsStore.updateStatus(dealId, status, comment);

    if (!deal) {
      return {
        success: false,
        error: 'Deal not found',
        dealId,
      };
    }

    return {
      success: true,
      message: `Deal status updated to ${status}`,
      deal: {
        id: deal.id,
        name: deal.name,
        buyerStatus: deal.buyerStatus,
      },
    };
  },
};

/**
 * All available tools
 */
export const allTools: ToolDefinition[] = [
  listDeals,
  getDeal,
  createDeal,
  updateDeal,
  syncDeal,
  validateDeal,
  matchDeal,
  updateDealStatus,
];
