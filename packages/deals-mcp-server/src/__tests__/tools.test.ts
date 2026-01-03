import { describe, it, expect, beforeEach } from 'vitest';
import {
  listDeals,
  getDeal,
  createDeal,
  updateDeal,
  syncDeal,
  validateDeal,
  matchDeal,
  updateDealStatus,
} from '../tools/index.js';
import { dealsStore } from '../store/deals-store.js';

describe('MCP Tools', () => {
  beforeEach(() => {
    dealsStore.reset();
  });

  describe('deals_list', () => {
    it('should list all deals', async () => {
      const result = (await listDeals.handler({})) as any;

      expect(result.count).toBeGreaterThan(0);
      expect(result.deals).toBeDefined();
      expect(result.deals[0]).toHaveProperty('id');
      expect(result.deals[0]).toHaveProperty('name');
    });

    it('should filter by format', async () => {
      const result = (await listDeals.handler({
        filters: { format: 'video' },
      })) as any;

      for (const deal of result.deals) {
        expect(deal.formats).toContain('video');
      }
    });
  });

  describe('deals_get', () => {
    it('should get a deal by ID', async () => {
      const deals = dealsStore.list();
      const dealId = deals[0].id;

      const result = (await getDeal.handler({ dealId })) as any;

      expect(result.deal).toBeDefined();
      expect(result.deal.id).toBe(dealId);
    });

    it('should return error for non-existent deal', async () => {
      const result = (await getDeal.handler({ dealId: 'non-existent' })) as any;

      expect(result.error).toBe('Deal not found');
    });
  });

  describe('deals_create', () => {
    it('should create a new deal', async () => {
      const result = (await createDeal.handler({
        deal: {
          name: 'New Tool Test Deal',
          terms: {
            auctionType: 'first-price',
            bidFloor: 12.5,
            bidFloorCurrency: 'USD',
          },
          inventory: {
            publisherIds: ['pub-tool-test'],
            formats: ['video'],
          },
        },
      })) as any;

      expect(result.success).toBe(true);
      expect(result.deal).toBeDefined();
      expect(result.deal.name).toBe('New Tool Test Deal');
      expect(result.deal.terms.bidFloor).toBe(12.5);
    });
  });

  describe('deals_update', () => {
    it('should update an existing deal', async () => {
      const deals = dealsStore.list();
      const dealId = deals[0].id;

      const result = (await updateDeal.handler({
        dealId,
        updates: {
          name: 'Updated Deal Name',
        },
      })) as any;

      expect(result.success).toBe(true);
      expect(result.deal.name).toBe('Updated Deal Name');
    });

    it('should return error for non-existent deal', async () => {
      const result = (await updateDeal.handler({
        dealId: 'non-existent',
        updates: { name: 'New Name' },
      })) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deal not found');
    });
  });

  describe('deals_sync', () => {
    it('should simulate syncing a deal to a DSP', async () => {
      const deals = dealsStore.list();
      const dealId = deals[0].id;

      const result = (await syncDeal.handler({
        dealId,
        dspId: 'dsp-test',
        dspName: 'Test DSP',
      })) as any;

      expect(result.success).toBe(true);
      expect(result.dealId).toBe(dealId);
      expect(result.dspId).toBe('dsp-test');
      expect(result.syncedAt).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('should return error for non-existent deal', async () => {
      const result = (await syncDeal.handler({
        dealId: 'non-existent',
        dspId: 'dsp-test',
      })) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deal not found');
    });
  });

  describe('deals_validate', () => {
    it('should validate a valid deal', async () => {
      const validDeal = {
        id: 'deal-123',
        name: 'Valid Deal',
        version: '1.0',
        terms: {
          auctionType: 'first-price',
          bidFloor: 10,
          bidFloorCurrency: 'USD',
        },
        inventory: {
          publisherIds: ['pub-1'],
          formats: ['video'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = (await validateDeal.handler({ deal: validDeal })) as any;

      expect(result.valid).toBe(true);
    });

    it('should return errors for invalid deal', async () => {
      const invalidDeal = {
        id: '',
        name: 'Invalid Deal',
      };

      const result = (await validateDeal.handler({ deal: invalidDeal })) as any;

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('deals_match', () => {
    let testDealId: string;

    beforeEach(() => {
      const deal = dealsStore.create({
        name: 'Match Test Deal',
        terms: {
          auctionType: 'first-price',
          bidFloor: 10,
          bidFloorCurrency: 'USD',
        },
        inventory: {
          publisherIds: ['pub-match-test'],
          siteIds: ['site-match-test'],
          formats: ['video'],
          deviceTypes: ['desktop', 'ctv'],
          geoTargeting: {
            countries: ['US', 'CA'],
          },
        },
        buyerSeats: ['seat-allowed'],
      });
      testDealId = deal.id;
    });

    it('should match a valid bid request', async () => {
      const result = (await matchDeal.handler({
        dealId: testDealId,
        bidRequest: {
          id: 'req-1',
          imp: [{ id: 'imp-1', video: { mimes: ['video/mp4'] } }],
          site: {
            id: 'site-match-test',
            publisher: { id: 'pub-match-test' },
          },
          device: {
            devicetype: 2, // desktop
            geo: { country: 'US' },
          },
          user: { buyeruid: 'seat-allowed' },
        },
      })) as any;

      expect(result.matched).toBe(true);
      expect(result.pmpObject).toBeDefined();
      expect(result.pmpObject.deals[0].id).toBe(testDealId);
    });

    it('should not match wrong format', async () => {
      const result = (await matchDeal.handler({
        dealId: testDealId,
        bidRequest: {
          id: 'req-2',
          imp: [{ id: 'imp-1', banner: { w: 300, h: 250 } }],
          site: {
            id: 'site-match-test',
            publisher: { id: 'pub-match-test' },
          },
        },
      })) as any;

      expect(result.matched).toBe(false);
      expect(result.reasons).toContain('No matching format. Deal requires: video');
    });

    it('should not match wrong geo', async () => {
      const result = (await matchDeal.handler({
        dealId: testDealId,
        bidRequest: {
          id: 'req-3',
          imp: [{ id: 'imp-1', video: { mimes: ['video/mp4'] } }],
          site: {
            publisher: { id: 'pub-match-test' },
          },
          device: {
            geo: { country: 'FR' },
          },
        },
      })) as any;

      expect(result.matched).toBe(false);
      expect(result.reasons.some((r: string) => r.includes('Country FR not in deal targeting'))).toBe(
        true
      );
    });

    it('should return error for non-existent deal', async () => {
      const result = (await matchDeal.handler({
        dealId: 'non-existent',
        bidRequest: {
          id: 'req-4',
          imp: [{ id: 'imp-1', video: { mimes: ['video/mp4'] } }],
        },
      })) as any;

      expect(result.matched).toBe(false);
      expect(result.reasons).toContain('Deal not found');
    });
  });

  describe('deals_update_status', () => {
    it('should update deal status to active', async () => {
      const deals = dealsStore.list();
      const dealId = deals[0].id;

      const result = (await updateDealStatus.handler({
        dealId,
        status: 'active',
        comment: 'Approved by buyer',
      })) as any;

      expect(result.success).toBe(true);
      expect(result.deal.buyerStatus.status).toBe('active');
      expect(result.deal.buyerStatus.comment).toBe('Approved by buyer');
    });

    it('should update deal status to rejected', async () => {
      const deals = dealsStore.list();
      const dealId = deals[0].id;

      const result = (await updateDealStatus.handler({
        dealId,
        status: 'rejected',
        comment: 'Does not meet requirements',
      })) as any;

      expect(result.success).toBe(true);
      expect(result.deal.buyerStatus.status).toBe('rejected');
    });

    it('should return error for non-existent deal', async () => {
      const result = (await updateDealStatus.handler({
        dealId: 'non-existent',
        status: 'active',
      })) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deal not found');
    });
  });
});
