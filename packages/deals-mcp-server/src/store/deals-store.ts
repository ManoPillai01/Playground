import { createHash } from 'crypto';
import {
  Deal,
  DealCreateInput,
  DealUpdateInput,
  DealFilter,
  DealStatusType,
} from '@agent-resolver/schema';

/**
 * Generate a deterministic hash for a deal
 */
function generateDealHash(deal: Omit<Deal, 'hash'>): string {
  const content = JSON.stringify({
    id: deal.id,
    name: deal.name,
    version: deal.version,
    terms: deal.terms,
    inventory: deal.inventory,
    curation: deal.curation,
  });
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Generate a unique deal ID
 */
function generateDealId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `deal-${timestamp}-${random}`;
}

/**
 * In-memory store for deals
 */
export class DealsStore {
  private deals: Map<string, Deal> = new Map();

  constructor() {
    this.seedMockData();
  }

  /**
   * Seed the store with mock data
   */
  private seedMockData(): void {
    const mockDeals: DealCreateInput[] = [
      {
        name: 'Premium Video PMP - Acme Media',
        terms: {
          auctionType: 'first-price',
          bidFloor: 15.0,
          bidFloorCurrency: 'USD',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-12-31T23:59:59Z',
        },
        inventory: {
          publisherIds: ['pub-acme-001'],
          siteIds: ['site-acme-news'],
          formats: ['video'],
          deviceTypes: ['desktop', 'ctv'],
          geoTargeting: {
            countries: ['US', 'CA'],
          },
        },
        curation: {
          curatorId: 'cur-premium-001',
          curatorName: 'Premium Curations Inc',
          sellerId: 'seller-acme',
          sellerName: 'Acme Media Group',
        },
        buyerSeats: ['seat-advertiser-a', 'seat-advertiser-b'],
        advertiserDomains: ['brand-a.com', 'brand-b.com'],
      },
      {
        name: 'Mobile Banner Deal - Beta Networks',
        terms: {
          auctionType: 'second-price',
          bidFloor: 2.5,
          bidFloorCurrency: 'USD',
        },
        inventory: {
          publisherIds: ['pub-beta-001', 'pub-beta-002'],
          appIds: ['app-beta-games', 'app-beta-news'],
          formats: ['banner'],
          deviceTypes: ['mobile', 'tablet'],
          geoTargeting: {
            countries: ['US'],
            regions: ['CA', 'NY', 'TX'],
          },
        },
        curation: {
          curatorId: 'cur-mobile-001',
          curatorName: 'Mobile First Curations',
          packagerId: 'pkg-beta',
          packagerName: 'Beta Ad Ops',
          sellerId: 'seller-beta',
          sellerName: 'Beta Networks LLC',
        },
        buyerSeats: ['seat-agency-x'],
      },
      {
        name: 'Audio Streaming Deal - Gamma Audio',
        terms: {
          auctionType: 'fixed-price',
          bidFloor: 8.0,
          bidFloorCurrency: 'USD',
          minCpmPerSec: 0.5,
          guaranteedImpressions: 1000000,
        },
        inventory: {
          publisherIds: ['pub-gamma-audio'],
          formats: ['audio'],
          deviceTypes: ['mobile', 'desktop'],
        },
        curation: {
          curatorId: 'cur-audio-001',
          curatorName: 'Audio Premium Network',
          sellerId: 'seller-gamma',
          sellerName: 'Gamma Audio Inc',
        },
      },
      {
        name: 'Native Content Deal - Delta Publishing',
        terms: {
          auctionType: 'first-price',
          bidFloor: 5.0,
          bidFloorCurrency: 'EUR',
        },
        inventory: {
          publisherIds: ['pub-delta-001'],
          siteIds: ['site-delta-lifestyle', 'site-delta-tech'],
          formats: ['native'],
          deviceTypes: ['desktop', 'mobile'],
          geoTargeting: {
            countries: ['DE', 'FR', 'GB'],
          },
        },
        buyerStatus: {
          status: 'active',
          lastUpdated: '2025-12-15T10:30:00Z',
          activatedAt: '2025-12-10T08:00:00Z',
        },
      },
      {
        name: 'CTV Premium Deal - Epsilon Entertainment',
        terms: {
          auctionType: 'first-price',
          bidFloor: 25.0,
          bidFloorCurrency: 'USD',
          minCpmPerSec: 1.0,
        },
        inventory: {
          publisherIds: ['pub-epsilon-ctv'],
          formats: ['video'],
          deviceTypes: ['ctv'],
          geoTargeting: {
            countries: ['US'],
          },
        },
        curation: {
          curatorId: 'cur-ctv-premium',
          curatorName: 'CTV Premium Curations',
          sellerId: 'seller-epsilon',
          sellerName: 'Epsilon Entertainment',
          supplyChain: [
            { asi: 'epsilon.com', sid: 'pub-001', hp: true },
            { asi: 'ctv-curator.com', sid: 'cur-001', hp: false },
          ],
        },
        buyerSeats: ['seat-brand-premium'],
        buyerStatus: {
          status: 'pending',
          comment: 'Awaiting creative approval',
          lastUpdated: '2025-12-20T14:00:00Z',
        },
      },
    ];

    for (const dealInput of mockDeals) {
      this.create(dealInput);
    }
  }

  /**
   * Get all deals, optionally filtered
   */
  list(filter?: DealFilter): Deal[] {
    let deals = Array.from(this.deals.values());

    if (filter) {
      if (filter.status) {
        deals = deals.filter((d) => d.buyerStatus?.status === filter.status);
      }
      if (filter.format) {
        deals = deals.filter((d) => d.inventory.formats.includes(filter.format!));
      }
      if (filter.buyerSeat) {
        deals = deals.filter((d) => d.buyerSeats?.includes(filter.buyerSeat!));
      }
      if (filter.curatorId) {
        deals = deals.filter((d) => d.curation?.curatorId === filter.curatorId);
      }
      if (filter.publisherId) {
        deals = deals.filter((d) =>
          d.inventory.publisherIds.includes(filter.publisherId!)
        );
      }
    }

    // Sort deterministically by ID
    return deals.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Get a deal by ID
   */
  get(id: string): Deal | undefined {
    return this.deals.get(id);
  }

  /**
   * Create a new deal
   */
  create(input: DealCreateInput): Deal {
    const now = new Date().toISOString();
    const id = generateDealId();

    const deal: Deal = {
      id,
      name: input.name,
      version: input.version ?? '1.0',
      buyerSeats: input.buyerSeats,
      advertiserDomains: input.advertiserDomains,
      terms: {
        auctionType: input.terms.auctionType ?? 'first-price',
        bidFloor: input.terms.bidFloor ?? 0,
        bidFloorCurrency: input.terms.bidFloorCurrency ?? 'USD',
        minCpmPerSec: input.terms.minCpmPerSec,
        guaranteedImpressions: input.terms.guaranteedImpressions,
        startDate: input.terms.startDate,
        endDate: input.terms.endDate,
      },
      inventory: input.inventory,
      curation: input.curation,
      buyerStatus: input.buyerStatus,
      createdAt: now,
      updatedAt: now,
    };

    deal.hash = generateDealHash(deal);
    this.deals.set(id, deal);
    return deal;
  }

  /**
   * Update an existing deal
   */
  update(id: string, updates: DealUpdateInput): Deal | undefined {
    const existing = this.deals.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Deal = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      terms: updates.terms ? { ...existing.terms, ...updates.terms } : existing.terms,
      inventory: updates.inventory
        ? { ...existing.inventory, ...updates.inventory }
        : existing.inventory,
    };

    updated.hash = generateDealHash(updated);
    this.deals.set(id, updated);
    return updated;
  }

  /**
   * Delete a deal
   */
  delete(id: string): boolean {
    return this.deals.delete(id);
  }

  /**
   * Update buyer status for a deal
   */
  updateStatus(id: string, status: DealStatusType, comment?: string): Deal | undefined {
    const existing = this.deals.get(id);
    if (!existing) {
      return undefined;
    }

    const now = new Date().toISOString();
    const buyerStatus = {
      status,
      comment,
      lastUpdated: now,
      activatedAt: status === 'active' ? now : existing.buyerStatus?.activatedAt,
    };

    return this.update(id, { buyerStatus });
  }

  /**
   * Get count of deals
   */
  count(): number {
    return this.deals.size;
  }

  /**
   * Clear all deals
   */
  clear(): void {
    this.deals.clear();
  }

  /**
   * Reset to initial mock data
   */
  reset(): void {
    this.clear();
    this.seedMockData();
  }
}

// Singleton instance
export const dealsStore = new DealsStore();
