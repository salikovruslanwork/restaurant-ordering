import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ApiErrorCode,
  PricingKind,
  ServerEventType,
  type Category,
  type EventEnvelope,
  type MenuItem,
  type MenuSnapshot
} from '@restaurant/contracts';

import { AppModule } from '../app.module.js';
import { configureApp } from '../app.setup.js';
import { EventsService } from '../events/index.js';
import { InMemoryMenuRepository } from './in-memory-menu.repository.js';
import { MENU_MESSAGES, MENU_REPOSITORY } from './menu.config.js';

const CLIENT_ID = '3f2b8c1e-7a4d-4e6f-9b0a-1c2d3e4f5a6b';
const MISSING_ID = '00000000-0000-4000-8000-999999999999';

describe('MenuController', () => {
  let app: NestExpressApplication;
  let adminEvents: EventEnvelope[];
  let customerEvents: EventEnvelope[];
  let categoryId: string;

  function server(): Parameters<typeof request>[0] {
    return app.getHttpServer();
  }

  function itemBody(overrides: object = {}): object {
    return {
      categoryId,
      name: 'Oolong',
      description: 'Roasted tea',
      pricing: { kind: PricingKind.Fixed, price: 450 },
      isAvailable: true,
      ...overrides
    };
  }

  async function createItem(overrides: object = {}): Promise<MenuItem> {
    const response = await request(server()).post('/api/items').send(itemBody(overrides));
    expect(response.status).toBe(201);
    return response.body;
  }

  function eventTypes(events: EventEnvelope[]): ServerEventType[] {
    return events.map(({ event }) => event.type);
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MENU_REPOSITORY)
      .useValue(new InMemoryMenuRepository({ categories: [], items: [] }))
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    const created = await request(server()).post('/api/categories').send({ name: 'Drinks' });
    categoryId = (created.body as Category).id;

    const events = app.get(EventsService);
    adminEvents = [];
    customerEvents = [];
    events.adminStream(null).subscribe((envelope) => adminEvents.push(envelope));
    events.customerStream(CLIENT_ID, null).subscribe((envelope) => customerEvents.push(envelope));
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/menu', () => {
    it('returns the snapshot with the current seq', async () => {
      const item = await createItem();

      const response = await request(server()).get('/api/menu');
      const snapshot: MenuSnapshot = response.body;

      expect(response.status).toBe(200);
      expect(snapshot.categories.map(({ id }) => id)).toEqual([categoryId]);
      expect(snapshot.items).toEqual([item]);
      expect(snapshot.seq).toBe(app.get(EventsService).currentSeq);
    });

    it('has a seq that resumes the stream without a gap', async () => {
      const { body: snapshot } = await request(server()).get('/api/menu');
      const received: EventEnvelope[] = [];
      app
        .get(EventsService)
        .adminStream((snapshot as MenuSnapshot).seq)
        .subscribe((envelope) => received.push(envelope));

      await createItem();

      expect(eventTypes(received)).toEqual([ServerEventType.ItemUpserted]);
    });

    it('serves the seed by default, compressed', async () => {
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      const seeded = moduleRef.createNestApplication<NestExpressApplication>();
      configureApp(seeded);
      await seeded.init();

      const { body, headers } = await request(seeded.getHttpServer())
        .get('/api/menu')
        .set('Accept-Encoding', 'gzip');
      await seeded.close();

      expect(headers['content-encoding']).toBe('gzip');
      expect((body as MenuSnapshot).categories).toHaveLength(25);
      expect((body as MenuSnapshot).items).toHaveLength(625);
    });
  });

  describe('categories', () => {
    it('creates with a trimmed name and streams the change to both apps', async () => {
      const response = await request(server()).post('/api/categories').send({ name: '  Soups ' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: 'Soups', version: 1 });
      expect(eventTypes(adminEvents)).toEqual([ServerEventType.CategoryUpserted]);
      expect(eventTypes(customerEvents)).toEqual([ServerEventType.CategoryUpserted]);
    });

    it('updates with PATCH', async () => {
      const response = await request(server())
        .patch(`/api/categories/${categoryId}`)
        .send({ name: 'Teas' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ name: 'Teas', sortOrder: 0, version: 2 });
    });

    it('deletes with 204 and streams the change', async () => {
      const response = await request(server()).delete(`/api/categories/${categoryId}`);

      expect(response.status).toBe(204);
      expect(eventTypes(customerEvents)).toEqual([ServerEventType.CategoryDeleted]);
    });

    it('returns 409 CATEGORY_NOT_EMPTY', async () => {
      await createItem();

      const response = await request(server()).delete(`/api/categories/${categoryId}`);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe(ApiErrorCode.CategoryNotEmpty);
    });

    it('returns 404 NOT_FOUND for an unknown id', async () => {
      const response = await request(server())
        .patch(`/api/categories/${MISSING_ID}`)
        .send({ name: 'Teas' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe(ApiErrorCode.NotFound);
    });

    it.each([
      ['a missing name', {}, 'name', MENU_MESSAGES.categoryNameRequired],
      ['a blank name', { name: '   ' }, 'name', MENU_MESSAGES.categoryNameRequired],
      ['a name that is not text', { name: 1 }, 'name', MENU_MESSAGES.categoryNameRequired],
      ['a long name', { name: 'x'.repeat(31) }, 'name', MENU_MESSAGES.categoryNameTooLong],
      [
        'a fractional position',
        { name: 'A', sortOrder: 1.5 },
        'sortOrder',
        MENU_MESSAGES.sortOrderInvalid
      ],
      [
        'a negative position',
        { name: 'A', sortOrder: -1 },
        'sortOrder',
        MENU_MESSAGES.sortOrderInvalid
      ]
    ])('rejects %s on create', async (_name, body, field, message) => {
      const response = await request(server()).post('/api/categories').send(body);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(ApiErrorCode.Validation);
      expect(response.body.fields[field]).toContain(message);
    });

    it('rejects null instead of leaving the field unchanged on PATCH', async () => {
      const response = await request(server())
        .patch(`/api/categories/${categoryId}`)
        .send({ name: null });

      expect(response.status).toBe(400);
      expect(response.body.fields.name).toContain(MENU_MESSAGES.categoryNameRequired);
    });
  });

  describe('items', () => {
    it('creates and streams the change to both apps', async () => {
      const item = await createItem();

      expect(item).toMatchObject({ name: 'Oolong', version: 1 });
      expect(eventTypes(adminEvents)).toEqual([ServerEventType.ItemUpserted]);
      expect(eventTypes(customerEvents)).toEqual([ServerEventType.ItemUpserted]);
    });

    it('creates an open-price item and drops a stray price', async () => {
      const item = await createItem({ pricing: { kind: PricingKind.Open, price: 100 } });

      expect(item.pricing).toEqual({ kind: PricingKind.Open });
    });

    it('changes availability alone with PATCH, without touching other fields', async () => {
      const item = await createItem();

      const response = await request(server())
        .patch(`/api/items/${item.id}`)
        .send({ isAvailable: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...item,
        isAvailable: false,
        version: 2,
        updatedAt: response.body.updatedAt
      });
    });

    it('switches from fixed to open price with PATCH', async () => {
      const item = await createItem();

      const response = await request(server())
        .patch(`/api/items/${item.id}`)
        .send({ pricing: { kind: PricingKind.Open } });

      expect(response.body.pricing).toEqual({ kind: PricingKind.Open });
    });

    it('does not bump the version on an empty PATCH', async () => {
      const item = await createItem();

      const response = await request(server()).patch(`/api/items/${item.id}`).send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual(item);
    });

    it('deletes with 204 and streams the change', async () => {
      const item = await createItem();

      const response = await request(server()).delete(`/api/items/${item.id}`);

      expect(response.status).toBe(204);
      expect(eventTypes(customerEvents)).toEqual([
        ServerEventType.ItemUpserted,
        ServerEventType.ItemDeleted
      ]);
    });

    it('returns 404 NOT_FOUND for an unknown id', async () => {
      const response = await request(server()).delete(`/api/items/${MISSING_ID}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe(ApiErrorCode.NotFound);
    });

    it('rejects an unknown category', async () => {
      const response = await request(server())
        .post('/api/items')
        .send(itemBody({ categoryId: MISSING_ID }));

      expect(response.status).toBe(400);
      expect(response.body.fields.categoryId).toContain(MENU_MESSAGES.categoryRequired);
    });

    it.each([
      ['a bad category id', { categoryId: 'abc' }, 'categoryId', MENU_MESSAGES.categoryRequired],
      ['a blank name', { name: ' ' }, 'name', MENU_MESSAGES.itemNameRequired],
      ['a long name', { name: 'x'.repeat(61) }, 'name', MENU_MESSAGES.itemNameTooLong],
      [
        'a long description',
        { description: 'x'.repeat(201) },
        'description',
        MENU_MESSAGES.descriptionTooLong
      ],
      ['missing pricing', { pricing: undefined }, 'pricing', MENU_MESSAGES.pricingRequired],
      ['null pricing', { pricing: null }, 'pricing', MENU_MESSAGES.pricingRequired],
      [
        'pricing that is not an object',
        { pricing: 'free' },
        'pricing',
        MENU_MESSAGES.pricingRequired
      ],
      [
        'pricing without a kind',
        { pricing: { price: 100 } },
        'pricing.kind',
        MENU_MESSAGES.pricingRequired
      ],
      [
        'an unknown pricing kind',
        { pricing: { kind: 'free' } },
        'pricing.kind',
        MENU_MESSAGES.pricingRequired
      ],
      [
        'a fixed price without a price',
        { pricing: { kind: 'fixed' } },
        'pricing.price',
        MENU_MESSAGES.priceInvalid
      ],
      [
        'a price in fractions of a cent',
        { pricing: { kind: 'fixed', price: 1.5 } },
        'pricing.price',
        MENU_MESSAGES.priceInvalid
      ],
      [
        'a price of 0',
        { pricing: { kind: 'fixed', price: 0 } },
        'pricing.price',
        MENU_MESSAGES.priceTooLow
      ],
      [
        'a price over $10,000',
        { pricing: { kind: 'fixed', price: 1_000_001 } },
        'pricing.price',
        MENU_MESSAGES.priceTooHigh
      ],
      [
        'missing availability',
        { isAvailable: undefined },
        'isAvailable',
        MENU_MESSAGES.availabilityInvalid
      ]
    ])('rejects %s on create', async (_name, overrides, field, message) => {
      const response = await request(server()).post('/api/items').send(itemBody(overrides));

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(ApiErrorCode.Validation);
      expect(response.body.fields[field]).toContain(message);
      expect(adminEvents).toEqual([]);
    });

    it.each([
      [{ name: null }, 'name'],
      [{ description: null }, 'description'],
      [{ pricing: null }, 'pricing'],
      [{ isAvailable: null }, 'isAvailable'],
      [{ categoryId: null }, 'categoryId']
    ])('rejects %j on PATCH', async (body, field) => {
      const item = await createItem();

      const response = await request(server()).patch(`/api/items/${item.id}`).send(body);

      expect(response.status).toBe(400);
      expect(response.body.fields[field]).toBeDefined();
    });
  });
});
