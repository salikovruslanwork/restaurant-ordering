import { beforeEach, describe, expect, it } from 'vitest';

import {
  ApiErrorCode,
  PricingKind,
  ServerEventType,
  type ApiError,
  type Category,
  type CreateItemRequest,
  type EventEnvelope,
  type ServerEvent
} from '@restaurant/contracts';

import { ApiException } from '../common/index.js';
import { EventsService } from '../events/index.js';
import { InMemoryMenuRepository } from './in-memory-menu.repository.js';
import { MENU_MESSAGES } from './menu.config.js';
import { MenuService } from './menu.service.js';

const MISSING_ID = '00000000-0000-4000-8000-999999999999';

describe('MenuService', () => {
  let service: MenuService;
  let events: EventsService;
  let published: EventEnvelope[];
  let drinks: Category;

  function itemRequest(overrides: Partial<CreateItemRequest> = {}): CreateItemRequest {
    return {
      categoryId: drinks.id,
      name: 'Oolong',
      description: 'Roasted tea',
      pricing: { kind: PricingKind.Fixed, price: 450 },
      isAvailable: true,
      ...overrides
    };
  }

  function publishedEvents(): ServerEvent[] {
    return published.map(({ event }) => event);
  }

  async function errorOf(action: Promise<unknown>): Promise<{ status: number; error: ApiError }> {
    const exception: unknown = await action.then(
      () => null,
      (reason: unknown) => reason
    );
    if (!(exception instanceof ApiException)) {
      throw new Error('Expected an ApiException');
    }
    return { status: exception.getStatus(), error: exception.error };
  }

  beforeEach(async () => {
    events = new EventsService({ logSize: 100, heartbeatIntervalMs: 1000 });
    service = new MenuService(new InMemoryMenuRepository({ categories: [], items: [] }), events);
    drinks = await service.createCategory({ name: 'Drinks' });
    published = [];
    events.adminStream(null).subscribe((envelope) => published.push(envelope));
  });

  describe('getSnapshot', () => {
    it('returns categories by position, items and the current seq', async () => {
      const first = await service.createCategory({ name: 'First', sortOrder: 0 });
      await service.updateCategory(drinks.id, { sortOrder: 5 });
      const item = await service.createItem(itemRequest());

      const snapshot = await service.getSnapshot();

      expect(snapshot.categories.map(({ id }) => id)).toEqual([first.id, drinks.id]);
      expect(snapshot.items).toEqual([item]);
      expect(snapshot.seq).toBe(events.currentSeq);
    });
  });

  describe('categories', () => {
    it('creates at version 1, appends to the end and publishes', async () => {
      const category = await service.createCategory({ name: 'Soups' });

      expect(category).toMatchObject({ name: 'Soups', version: 1, sortOrder: 1 });
      expect(publishedEvents()).toEqual([{ type: ServerEventType.CategoryUpserted, category }]);
    });

    it('starts at position 0 when there are no categories', async () => {
      await service.deleteCategory(drinks.id);

      const category = await service.createCategory({ name: 'Soups' });

      expect(category.sortOrder).toBe(0);
    });

    it('uses an explicit position', async () => {
      const category = await service.createCategory({ name: 'Soups', sortOrder: 7 });

      expect(category.sortOrder).toBe(7);
    });

    it('rejects a duplicate name ignoring case, and publishes nothing', async () => {
      const { status, error } = await errorOf(service.createCategory({ name: 'DRINKS' }));

      expect(status).toBe(400);
      expect(error).toMatchObject({
        code: ApiErrorCode.Validation,
        fields: { name: [MENU_MESSAGES.categoryNameTaken] }
      });
      expect(published).toEqual([]);
    });

    it('updates, bumps the version and publishes', async () => {
      const updated = await service.updateCategory(drinks.id, { name: 'Teas', sortOrder: 3 });

      expect(updated).toEqual({ ...drinks, name: 'Teas', sortOrder: 3, version: 2 });
      expect(publishedEvents()).toEqual([
        { type: ServerEventType.CategoryUpserted, category: updated }
      ]);
    });

    it('allows changing the case of its own name', async () => {
      const updated = await service.updateCategory(drinks.id, { name: 'DRINKS' });

      expect(updated.name).toBe('DRINKS');
    });

    it('rejects a rename to a name another category uses', async () => {
      await service.createCategory({ name: 'Soups' });

      const { error } = await errorOf(service.updateCategory(drinks.id, { name: 'soups' }));

      expect(error.code).toBe(ApiErrorCode.Validation);
    });

    it.each([[{}], [{ name: 'Drinks', sortOrder: 0 }]])(
      'does not bump or publish when nothing changed: %j',
      async (request) => {
        const result = await service.updateCategory(drinks.id, request);

        expect(result).toEqual(drinks);
        expect(published).toEqual([]);
      }
    );

    it('deletes an empty category and publishes', async () => {
      await service.deleteCategory(drinks.id);

      expect(publishedEvents()).toEqual([{ type: ServerEventType.CategoryDeleted, id: drinks.id }]);
      expect((await service.getSnapshot()).categories).toEqual([]);
    });

    it('refuses to delete a category with items', async () => {
      await service.createItem(itemRequest());
      published.length = 0;

      const { status, error } = await errorOf(service.deleteCategory(drinks.id));

      expect(status).toBe(409);
      expect(error.code).toBe(ApiErrorCode.CategoryNotEmpty);
      expect(error.message).toContain("'Drinks'");
      expect(error.message).toContain('1 item.');
      expect(published).toEqual([]);
      expect((await service.getSnapshot()).categories).toHaveLength(1);
    });

    it.each([
      ['update', () => service.updateCategory(MISSING_ID, { name: 'Soups' })],
      ['delete', () => service.deleteCategory(MISSING_ID)]
    ])('returns NOT_FOUND on %s of an unknown category', async (_name, action) => {
      const { status, error } = await errorOf(action());

      expect(status).toBe(404);
      expect(error.code).toBe(ApiErrorCode.NotFound);
    });
  });

  describe('items', () => {
    it('creates at version 1 and publishes', async () => {
      const item = await service.createItem(itemRequest());

      expect(item).toMatchObject({ ...itemRequest(), version: 1 });
      expect(publishedEvents()).toEqual([{ type: ServerEventType.ItemUpserted, item }]);
    });

    it('rejects an unknown category', async () => {
      const { status, error } = await errorOf(
        service.createItem(itemRequest({ categoryId: MISSING_ID }))
      );

      expect(status).toBe(400);
      expect(error).toMatchObject({ fields: { categoryId: [MENU_MESSAGES.categoryRequired] } });
      expect(published).toEqual([]);
    });

    it('updates only the given fields, bumps the version and publishes', async () => {
      const item = await service.createItem(itemRequest());
      published.length = 0;

      const updated = await service.updateItem(item.id, {
        pricing: { kind: PricingKind.Fixed, price: 500 }
      });

      expect(updated).toEqual({
        ...item,
        pricing: { kind: PricingKind.Fixed, price: 500 },
        version: 2,
        updatedAt: updated.updatedAt
      });
      expect(publishedEvents()).toEqual([{ type: ServerEventType.ItemUpserted, item: updated }]);
    });

    it('updates every field', async () => {
      const item = await service.createItem(itemRequest());
      const soups = await service.createCategory({ name: 'Soups' });

      const updated = await service.updateItem(item.id, {
        categoryId: soups.id,
        name: 'Miso',
        description: 'Warm',
        pricing: { kind: PricingKind.Open },
        isAvailable: false
      });

      expect(updated).toMatchObject({
        categoryId: soups.id,
        name: 'Miso',
        description: 'Warm',
        pricing: { kind: PricingKind.Open },
        isAvailable: false,
        version: 2
      });
    });

    it('rejects a move to an unknown category', async () => {
      const item = await service.createItem(itemRequest());

      const { error } = await errorOf(service.updateItem(item.id, { categoryId: MISSING_ID }));

      expect(error.code).toBe(ApiErrorCode.Validation);
    });

    it('does not bump or publish when nothing changed', async () => {
      const item = await service.createItem(itemRequest());
      published.length = 0;

      const result = await service.updateItem(item.id, {
        name: item.name,
        pricing: { kind: PricingKind.Fixed, price: 450 }
      });

      expect(result).toEqual(item);
      expect(published).toEqual([]);
    });

    it('stores plain pricing and drops a stray price on open-price items', async () => {
      class PricingInstance {
        kind = PricingKind.Open as const;
        price = 100;
      }

      const item = await service.createItem(itemRequest({ pricing: new PricingInstance() }));

      expect(item.pricing).toStrictEqual({ kind: PricingKind.Open });
    });

    it('deletes and publishes', async () => {
      const item = await service.createItem(itemRequest());
      published.length = 0;

      await service.deleteItem(item.id);

      expect(publishedEvents()).toEqual([{ type: ServerEventType.ItemDeleted, id: item.id }]);
      expect((await service.getSnapshot()).items).toEqual([]);
    });

    it.each([
      ['update', () => service.updateItem(MISSING_ID, { name: 'Miso' })],
      ['delete', () => service.deleteItem(MISSING_ID)]
    ])('returns NOT_FOUND on %s of an unknown item', async (_name, action) => {
      const { status, error } = await errorOf(action());

      expect(status).toBe(404);
      expect(error.code).toBe(ApiErrorCode.NotFound);
    });
  });
});
