import { z } from 'zod';

/**
 * Auction type for deal pricing
 */
export const AuctionType = z.enum(['first-price', 'second-price', 'fixed-price']);
export type AuctionType = z.infer<typeof AuctionType>;

/**
 * Inventory format types
 */
export const InventoryFormat = z.enum(['banner', 'video', 'audio', 'native']);
export type InventoryFormat = z.infer<typeof InventoryFormat>;

/**
 * Device types for targeting
 */
export const DeviceType = z.enum(['desktop', 'mobile', 'tablet', 'ctv']);
export type DeviceType = z.infer<typeof DeviceType>;

/**
 * Deal status from buyer perspective
 */
export const DealStatusType = z.enum(['pending', 'active', 'paused', 'rejected', 'expired']);
export type DealStatusType = z.infer<typeof DealStatusType>;

/**
 * Geographic targeting
 */
export const GeoTargeting = z.object({
  countries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
});
export type GeoTargeting = z.infer<typeof GeoTargeting>;

/**
 * Deal terms based on OpenRTB 2.6 and IAB Deals API v1.0
 */
export const DealTerms = z.object({
  auctionType: AuctionType.default('first-price'),
  bidFloor: z.number().min(0).default(0),
  bidFloorCurrency: z.string().length(3).default('USD'),
  minCpmPerSec: z.number().min(0).optional(),
  guaranteedImpressions: z.number().int().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type DealTerms = z.infer<typeof DealTerms>;

/**
 * Deal terms input - all fields with defaults are optional
 */
export const DealTermsInput = z.object({
  auctionType: AuctionType.optional(),
  bidFloor: z.number().min(0).optional(),
  bidFloorCurrency: z.string().length(3).optional(),
  minCpmPerSec: z.number().min(0).optional(),
  guaranteedImpressions: z.number().int().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type DealTermsInput = z.infer<typeof DealTermsInput>;

/**
 * Inventory information for deal targeting
 */
export const InventoryInfo = z.object({
  publisherIds: z.array(z.string().min(1)),
  siteIds: z.array(z.string()).optional(),
  appIds: z.array(z.string()).optional(),
  placementIds: z.array(z.string()).optional(),
  formats: z.array(InventoryFormat).min(1),
  deviceTypes: z.array(DeviceType).optional(),
  geoTargeting: GeoTargeting.optional(),
});
export type InventoryInfo = z.infer<typeof InventoryInfo>;

/**
 * Supply chain node for transparency
 */
export const SupplyChainNode = z.object({
  asi: z.string().min(1),
  sid: z.string().min(1),
  hp: z.boolean(),
});
export type SupplyChainNode = z.infer<typeof SupplyChainNode>;

/**
 * Curation information for curated deals
 */
export const CurationInfo = z.object({
  curatorId: z.string().min(1),
  curatorName: z.string().min(1),
  packagerId: z.string().optional(),
  packagerName: z.string().optional(),
  sellerId: z.string().min(1),
  sellerName: z.string().min(1),
  supplyChain: z.array(SupplyChainNode).optional(),
});
export type CurationInfo = z.infer<typeof CurationInfo>;

/**
 * Buyer status for deal sync
 */
export const BuyerStatus = z.object({
  status: DealStatusType,
  comment: z.string().optional(),
  lastUpdated: z.string().datetime(),
  activatedAt: z.string().datetime().optional(),
});
export type BuyerStatus = z.infer<typeof BuyerStatus>;

/**
 * Main Deal object combining OpenRTB 2.6 and IAB Deals API v1.0
 */
export const Deal = z.object({
  // Core identification
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().default('1.0'),

  // Parties (from OpenRTB 2.6)
  buyerSeats: z.array(z.string()).optional(),
  advertiserDomains: z.array(z.string()).optional(),

  // Terms
  terms: DealTerms,

  // Inventory targeting
  inventory: InventoryInfo,

  // Curation (from IAB Deals API)
  curation: CurationInfo.optional(),

  // Buyer status (for sync)
  buyerStatus: BuyerStatus.optional(),

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  hash: z.string().optional(),
});
export type Deal = z.infer<typeof Deal>;

/**
 * Deal creation input (partial deal without auto-generated fields)
 */
export const DealCreateInput = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  buyerSeats: z.array(z.string()).optional(),
  advertiserDomains: z.array(z.string()).optional(),
  terms: DealTermsInput,
  inventory: InventoryInfo,
  curation: CurationInfo.optional(),
  buyerStatus: BuyerStatus.optional(),
});
export type DealCreateInput = z.infer<typeof DealCreateInput>;

/**
 * Deal update input
 */
export const DealUpdateInput = z.object({
  name: z.string().min(1).optional(),
  version: z.string().optional(),
  buyerSeats: z.array(z.string()).optional(),
  advertiserDomains: z.array(z.string()).optional(),
  terms: DealTermsInput.optional(),
  inventory: InventoryInfo.partial().optional(),
  curation: CurationInfo.optional(),
  buyerStatus: BuyerStatus.optional(),
  updatedAt: z.string().datetime().optional(),
  hash: z.string().optional(),
});
export type DealUpdateInput = z.infer<typeof DealUpdateInput>;

/**
 * Deal filter for queries
 */
export const DealFilter = z.object({
  status: DealStatusType.optional(),
  format: InventoryFormat.optional(),
  buyerSeat: z.string().optional(),
  curatorId: z.string().optional(),
  publisherId: z.string().optional(),
});
export type DealFilter = z.infer<typeof DealFilter>;

/**
 * Deal sync request
 */
export const DealSyncRequest = z.object({
  dealId: z.string().min(1),
  dspId: z.string().min(1),
  dspName: z.string().optional(),
});
export type DealSyncRequest = z.infer<typeof DealSyncRequest>;

/**
 * Deal sync response
 */
export const DealSyncResponse = z.object({
  success: z.boolean(),
  dealId: z.string(),
  dspId: z.string(),
  syncedAt: z.string().datetime(),
  status: DealStatusType,
  message: z.string().optional(),
});
export type DealSyncResponse = z.infer<typeof DealSyncResponse>;

/**
 * OpenRTB PMP object for bid requests
 */
export const PmpObject = z.object({
  private_auction: z.number().int().min(0).max(1).default(0),
  deals: z.array(z.object({
    id: z.string(),
    bidfloor: z.number().optional(),
    bidfloorcur: z.string().optional(),
    wseat: z.array(z.string()).optional(),
    wadomain: z.array(z.string()).optional(),
    at: z.number().int().optional(),
  })),
});
export type PmpObject = z.infer<typeof PmpObject>;

/**
 * Simplified bid request for deal matching
 */
export const SimpleBidRequest = z.object({
  id: z.string(),
  imp: z.array(z.object({
    id: z.string(),
    banner: z.object({ w: z.number(), h: z.number() }).optional(),
    video: z.object({ mimes: z.array(z.string()) }).optional(),
    audio: z.object({ mimes: z.array(z.string()) }).optional(),
    native: z.object({}).optional(),
    pmp: PmpObject.optional(),
  })),
  site: z.object({
    id: z.string().optional(),
    publisher: z.object({ id: z.string() }).optional(),
  }).optional(),
  app: z.object({
    id: z.string().optional(),
    publisher: z.object({ id: z.string() }).optional(),
  }).optional(),
  device: z.object({
    devicetype: z.number().optional(),
    geo: z.object({
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
    }).optional(),
  }).optional(),
  user: z.object({
    buyeruid: z.string().optional(),
  }).optional(),
});
export type SimpleBidRequest = z.infer<typeof SimpleBidRequest>;

/**
 * Deal match result
 */
export const DealMatchResult = z.object({
  dealId: z.string(),
  matched: z.boolean(),
  reasons: z.array(z.string()),
  pmpObject: PmpObject.optional(),
});
export type DealMatchResult = z.infer<typeof DealMatchResult>;
