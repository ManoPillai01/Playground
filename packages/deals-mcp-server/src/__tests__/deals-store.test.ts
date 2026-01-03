import { describe, it, expect, beforeEach } from 'vitest';
import { DealsStore } from '../store/deals-store.js';

describe('DealsStore', () => {
  let store: DealsStore;

  beforeEach(() => {
    store = new DealsStore();
  });

  describe('initial state', () => {
    it('should have mock data seeded', () => {
      expect(store.count()).toBeGreaterThan(0);
    });

    it('should list all deals', () => {
      const deals = store.list();
      expect(deals.length).toBeGreaterThan(0);
      expect(deals[0]).toHaveProperty('id');
      expect(deals[0]).toHaveProperty('name');
      expect(deals[0]).toHaveProperty('terms');
      expect(deals[0]).toHaveProperty('inventory');
    });
  });

  describe('create', () => {
    it('should create a new deal', () => {
      const input = {
        name: 'Test Deal',
        terms: {
          auctionType: 'first-price' as const,
          bidFloor: 10.0,
          bidFloorCurrency: 'USD',
        },
        inventory: {
          publisherIds: ['pub-test'],
          formats: ['banner' as const],
        },
      };

      const deal = store.create(input);

      expect(deal.id).toBeDefined();
      expect(deal.name).toBe('Test Deal');
      expect(deal.terms.bidFloor).toBe(10.0);
      expect(deal.inventory.publisherIds).toContain('pub-test');
      expect(deal.createdAt).toBeDefined();
      expect(deal.hash).toBeDefined();
    });

    it('should generate unique IDs', () => {
      const deal1 = store.create({
        name: 'Deal 1',
        terms: { auctionType: 'first-price', bidFloor: 5 },
        inventory: { publisherIds: ['pub-1'], formats: ['video'] },
      });

      const deal2 = store.create({
        name: 'Deal 2',
        terms: { auctionType: 'first-price', bidFloor: 5 },
        inventory: { publisherIds: ['pub-2'], formats: ['video'] },
      });

      expect(deal1.id).not.toBe(deal2.id);
    });
  });

  describe('get', () => {
    it('should get a deal by ID', () => {
      const created = store.create({
        name: 'Get Test',
        terms: { auctionType: 'second-price', bidFloor: 3 },
        inventory: { publisherIds: ['pub-get'], formats: ['native'] },
      });

      const retrieved = store.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return undefined for non-existent ID', () => {
      const result = store.get('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update an existing deal', () => {
      const created = store.create({
        name: 'Update Test',
        terms: { auctionType: 'first-price', bidFloor: 5 },
        inventory: { publisherIds: ['pub-update'], formats: ['banner'] },
      });

      const updated = store.update(created.id, {
        name: 'Updated Name',
        terms: { bidFloor: 10 },
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.terms.bidFloor).toBe(10);
      expect(updated?.updatedAt).toBeDefined();
      // ID and createdAt should remain unchanged
      expect(updated?.id).toBe(created.id);
      expect(updated?.createdAt).toBe(created.createdAt);
    });

    it('should return undefined for non-existent ID', () => {
      const result = store.update('non-existent-id', { name: 'New Name' });
      expect(result).toBeUndefined();
    });

    it('should update the hash on changes', () => {
      const created = store.create({
        name: 'Hash Test',
        terms: { auctionType: 'first-price', bidFloor: 5 },
        inventory: { publisherIds: ['pub-hash'], formats: ['audio'] },
      });

      const updated = store.update(created.id, {
        terms: { bidFloor: 15 },
      });

      expect(updated?.hash).not.toBe(created.hash);
    });
  });

  describe('delete', () => {
    it('should delete an existing deal', () => {
      const created = store.create({
        name: 'Delete Test',
        terms: { auctionType: 'fixed-price', bidFloor: 8 },
        inventory: { publisherIds: ['pub-delete'], formats: ['video'] },
      });

      const deleted = store.delete(created.id);
      expect(deleted).toBe(true);

      const retrieved = store.get(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent ID', () => {
      const result = store.delete('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('list with filters', () => {
    beforeEach(() => {
      store.clear();

      store.create({
        name: 'Video Deal',
        terms: { auctionType: 'first-price', bidFloor: 10 },
        inventory: { publisherIds: ['pub-video'], formats: ['video'] },
        buyerSeats: ['seat-a'],
        buyerStatus: {
          status: 'active',
          lastUpdated: new Date().toISOString(),
        },
      });

      store.create({
        name: 'Banner Deal',
        terms: { auctionType: 'second-price', bidFloor: 5 },
        inventory: { publisherIds: ['pub-banner'], formats: ['banner'] },
        buyerSeats: ['seat-b'],
        buyerStatus: {
          status: 'pending',
          lastUpdated: new Date().toISOString(),
        },
      });

      store.create({
        name: 'Audio Deal',
        terms: { auctionType: 'fixed-price', bidFloor: 8 },
        inventory: { publisherIds: ['pub-audio'], formats: ['audio'] },
        curation: {
          curatorId: 'cur-1',
          curatorName: 'Test Curator',
          sellerId: 'sel-1',
          sellerName: 'Test Seller',
        },
      });
    });

    it('should filter by status', () => {
      const active = store.list({ status: 'active' });
      expect(active.length).toBe(1);
      expect(active[0].name).toBe('Video Deal');
    });

    it('should filter by format', () => {
      const banner = store.list({ format: 'banner' });
      expect(banner.length).toBe(1);
      expect(banner[0].name).toBe('Banner Deal');
    });

    it('should filter by buyer seat', () => {
      const seatA = store.list({ buyerSeat: 'seat-a' });
      expect(seatA.length).toBe(1);
      expect(seatA[0].name).toBe('Video Deal');
    });

    it('should filter by curator ID', () => {
      const curated = store.list({ curatorId: 'cur-1' });
      expect(curated.length).toBe(1);
      expect(curated[0].name).toBe('Audio Deal');
    });

    it('should filter by publisher ID', () => {
      const publisher = store.list({ publisherId: 'pub-video' });
      expect(publisher.length).toBe(1);
      expect(publisher[0].name).toBe('Video Deal');
    });
  });

  describe('updateStatus', () => {
    it('should update buyer status', () => {
      const created = store.create({
        name: 'Status Test',
        terms: { auctionType: 'first-price', bidFloor: 5 },
        inventory: { publisherIds: ['pub-status'], formats: ['banner'] },
      });

      const updated = store.updateStatus(created.id, 'active', 'Approved by buyer');

      expect(updated?.buyerStatus?.status).toBe('active');
      expect(updated?.buyerStatus?.comment).toBe('Approved by buyer');
      expect(updated?.buyerStatus?.activatedAt).toBeDefined();
    });

    it('should not set activatedAt for non-active status', () => {
      const created = store.create({
        name: 'Pending Status Test',
        terms: { auctionType: 'first-price', bidFloor: 5 },
        inventory: { publisherIds: ['pub-pending'], formats: ['banner'] },
      });

      const updated = store.updateStatus(created.id, 'pending');

      expect(updated?.buyerStatus?.status).toBe('pending');
      expect(updated?.buyerStatus?.activatedAt).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset to initial mock data', () => {
      store.clear();
      expect(store.count()).toBe(0);

      store.reset();
      expect(store.count()).toBeGreaterThan(0);
    });
  });

  describe('deterministic ordering', () => {
    it('should return deals sorted by ID', () => {
      const deals = store.list();

      for (let i = 1; i < deals.length; i++) {
        expect(deals[i - 1].id.localeCompare(deals[i].id)).toBeLessThanOrEqual(0);
      }
    });
  });
});
