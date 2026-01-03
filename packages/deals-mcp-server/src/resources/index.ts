import { z } from 'zod';
import { zodToJsonSchema } from '../utils/zod-to-json-schema.js';
import {
  Deal,
  DealTerms,
  InventoryInfo,
  CurationInfo,
  BuyerStatus,
  PmpObject,
} from '@agent-resolver/schema';
import { dealsStore } from '../store/deals-store.js';

/**
 * Resource definitions for the Deals MCP Server
 */

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<string>;
}

/**
 * Deal catalog resource - lists all available deals
 */
export const dealCatalog: ResourceDefinition = {
  uri: 'deals://catalog',
  name: 'Deal Catalog',
  description: 'Complete catalog of all available programmatic deals',
  mimeType: 'application/json',
  handler: async () => {
    const deals = dealsStore.list();
    const catalog = {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      totalDeals: deals.length,
      deals: deals.map((deal) => ({
        id: deal.id,
        name: deal.name,
        version: deal.version,
        status: deal.buyerStatus?.status ?? 'pending',
        terms: {
          auctionType: deal.terms.auctionType,
          bidFloor: deal.terms.bidFloor,
          currency: deal.terms.bidFloorCurrency,
        },
        inventory: {
          formats: deal.inventory.formats,
          publishers: deal.inventory.publisherIds,
          deviceTypes: deal.inventory.deviceTypes,
        },
        curator: deal.curation
          ? {
              id: deal.curation.curatorId,
              name: deal.curation.curatorName,
            }
          : null,
        seller: deal.curation
          ? {
              id: deal.curation.sellerId,
              name: deal.curation.sellerName,
            }
          : null,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      })),
    };
    return JSON.stringify(catalog, null, 2);
  },
};

/**
 * Deal schema resource - JSON Schema for deal validation
 */
export const dealSchema: ResourceDefinition = {
  uri: 'deals://schema',
  name: 'Deal Schema',
  description: 'JSON Schema for IAB Deals API deal object validation',
  mimeType: 'application/schema+json',
  handler: async () => {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'IAB Deals API - Deal Object',
      description:
        'Schema for programmatic deal objects based on IAB Deals API v1.0 and OpenRTB 2.6',
      ...zodToJsonSchema(Deal),
      definitions: {
        DealTerms: zodToJsonSchema(DealTerms),
        InventoryInfo: zodToJsonSchema(InventoryInfo),
        CurationInfo: zodToJsonSchema(CurationInfo),
        BuyerStatus: zodToJsonSchema(BuyerStatus),
      },
    };
    return JSON.stringify(schema, null, 2);
  },
};

/**
 * OpenRTB PMP template resource
 */
export const pmpTemplate: ResourceDefinition = {
  uri: 'deals://openrtb/pmp',
  name: 'OpenRTB PMP Template',
  description: 'Template for OpenRTB Private Marketplace (PMP) object in bid requests',
  mimeType: 'application/json',
  handler: async () => {
    const template = {
      description: 'OpenRTB 2.6 PMP Object Template',
      documentation: 'https://github.com/InteractiveAdvertisingBureau/openrtb2.x',
      template: {
        private_auction: {
          type: 'integer',
          description: '0 = all bids accepted, 1 = bids restricted to deals',
          values: [0, 1],
        },
        deals: {
          type: 'array',
          description: 'Array of Deal objects',
          items: {
            id: {
              type: 'string',
              required: true,
              description: 'Unique identifier for the deal',
            },
            bidfloor: {
              type: 'float',
              default: 0,
              description: 'Minimum bid for this impression (CPM)',
            },
            bidfloorcur: {
              type: 'string',
              default: 'USD',
              description: 'Currency (ISO-4217 alpha code)',
            },
            wseat: {
              type: 'array',
              description: 'Allowlist of buyer seats',
            },
            wadomain: {
              type: 'array',
              description: 'Allowlist of advertiser domains',
            },
            at: {
              type: 'integer',
              description: 'Auction type: 1=first price, 2=second price',
            },
          },
        },
      },
      example: {
        private_auction: 1,
        deals: [
          {
            id: 'deal-example-001',
            bidfloor: 10.0,
            bidfloorcur: 'USD',
            wseat: ['seat-123', 'seat-456'],
            wadomain: ['advertiser.com'],
            at: 1,
          },
        ],
      },
    };
    return JSON.stringify(template, null, 2);
  },
};

/**
 * Deal statistics resource
 */
export const dealStats: ResourceDefinition = {
  uri: 'deals://stats',
  name: 'Deal Statistics',
  description: 'Aggregate statistics about available deals',
  mimeType: 'application/json',
  handler: async () => {
    const deals = dealsStore.list();

    // Calculate statistics
    const stats = {
      generatedAt: new Date().toISOString(),
      total: deals.length,
      byStatus: {
        pending: deals.filter((d) => d.buyerStatus?.status === 'pending').length,
        active: deals.filter((d) => d.buyerStatus?.status === 'active').length,
        paused: deals.filter((d) => d.buyerStatus?.status === 'paused').length,
        rejected: deals.filter((d) => d.buyerStatus?.status === 'rejected').length,
        expired: deals.filter((d) => d.buyerStatus?.status === 'expired').length,
        noStatus: deals.filter((d) => !d.buyerStatus).length,
      },
      byFormat: {
        banner: deals.filter((d) => d.inventory.formats.includes('banner')).length,
        video: deals.filter((d) => d.inventory.formats.includes('video')).length,
        audio: deals.filter((d) => d.inventory.formats.includes('audio')).length,
        native: deals.filter((d) => d.inventory.formats.includes('native')).length,
      },
      byAuctionType: {
        'first-price': deals.filter((d) => d.terms.auctionType === 'first-price').length,
        'second-price': deals.filter((d) => d.terms.auctionType === 'second-price')
          .length,
        'fixed-price': deals.filter((d) => d.terms.auctionType === 'fixed-price').length,
      },
      averageBidFloor:
        deals.length > 0
          ? deals.reduce((sum, d) => sum + d.terms.bidFloor, 0) / deals.length
          : 0,
      currencies: [...new Set(deals.map((d) => d.terms.bidFloorCurrency))],
      curatedDeals: deals.filter((d) => d.curation).length,
    };

    return JSON.stringify(stats, null, 2);
  },
};

/**
 * All available resources
 */
export const allResources: ResourceDefinition[] = [
  dealCatalog,
  dealSchema,
  pmpTemplate,
  dealStats,
];
