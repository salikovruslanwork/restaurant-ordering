import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ApiErrorCode,
  CartChangeKind,
  OrderStatus,
  PricingKind,
  ServerEventType,
  type EventEnvelope,
  type MenuItem,
  type Order,
  type OrdersSnapshot
} from '@restaurant/contracts';

import { AppModule } from '../app.module.js';
import { configureApp } from '../app.setup.js';
import { EventsService } from '../events/index.js';
import { InMemoryMenuRepository } from '../menu/in-memory-menu.repository.js';
import { MENU_REPOSITORY, MenuService } from '../menu/index.js';
import { ORDER_MESSAGES } from './orders.config.js';

const CLIENT_ID = '3f2b8c1e-7a4d-4e6f-9b0a-1c2d3e4f5a6b';
const OTHER_CLIENT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const KEY = '11111111-2222-4333-8444-555555555555';
const OTHER_KEY = '66666666-7777-4888-8999-000000000000';

describe('OrdersController', () => {
  let app: NestExpressApplication;
  let tea: MenuItem;
  let cake: MenuItem;
  let adminEvents: EventEnvelope[];
  let customerEvents: EventEnvelope[];

  function server(): Parameters<typeof request>[0] {
    return app.getHttpServer();
  }

  function orderBody(overrides: object = {}): object {
    return {
      lines: [
        {
          itemId: tea.id,
          quantity: 2,
          unitPrice: 450,
          isOpenPrice: false,
          itemVersion: tea.version
        }
      ],
      discount: 100,
      ...overrides
    };
  }

  function post(body: object, key = KEY, clientId = CLIENT_ID): request.Test {
    return request(server())
      .post('/api/orders')
      .set('Idempotency-Key', key)
      .set('X-Client-Id', clientId)
      .send(body);
  }

  async function placeOrder(key = KEY, clientId = CLIENT_ID): Promise<Order> {
    const response = await post(orderBody(), key, clientId);
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

    const menu = app.get(MenuService);
    const category = await menu.createCategory({ name: 'Drinks' });
    const base = { categoryId: category.id, description: '', isAvailable: true };
    tea = await menu.createItem({
      ...base,
      name: 'Oolong',
      pricing: { kind: PricingKind.Fixed, price: 450 }
    });
    cake = await menu.createItem({
      ...base,
      name: 'Custom cake',
      pricing: { kind: PricingKind.Open }
    });

    const events = app.get(EventsService);
    adminEvents = [];
    customerEvents = [];
    events.adminStream(null).subscribe((envelope) => adminEvents.push(envelope));
    events.customerStream(CLIENT_ID, null).subscribe((envelope) => customerEvents.push(envelope));
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/orders', () => {
    it('creates the order with totals from the server', async () => {
      const response = await post(orderBody());

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        clientId: CLIENT_ID,
        subtotal: 900,
        discount: 100,
        total: 800,
        status: OrderStatus.Placed
      });
    });

    it('ignores totals sent by the client', async () => {
      const response = await post(orderBody({ subtotal: 1, total: 1, status: 'ready' }));

      expect(response.body).toMatchObject({ total: 800, status: OrderStatus.Placed });
    });

    it('returns one order for two requests with the same key', async () => {
      const first = await post(orderBody());
      const second = await post(orderBody());
      const { body } = await request(server()).get('/api/orders');

      expect(second.status).toBe(201);
      expect(second.body).toEqual(first.body);
      expect((body as OrdersSnapshot).orders).toHaveLength(1);
      expect(eventTypes(adminEvents)).toEqual([ServerEventType.OrderCreated]);
    });

    it('returns one order for two requests sent at the same time', async () => {
      const [first, second] = await Promise.all([post(orderBody()), post(orderBody())]);

      expect(second.body.id).toBe(first.body.id);
      expect(eventTypes(adminEvents)).toEqual([ServerEventType.OrderCreated]);
    });

    it('creates a new order for a new key', async () => {
      const first = await post(orderBody());
      const second = await post(orderBody(), OTHER_KEY);

      expect(second.body.id).not.toBe(first.body.id);
    });

    it('returns 422 IDEMPOTENCY_MISMATCH for the same key with a different payload', async () => {
      await post(orderBody());

      const response = await post(orderBody({ discount: 200 }));

      expect(response.status).toBe(422);
      expect(response.body.code).toBe(ApiErrorCode.IdempotencyMismatch);
      expect(response.body.message).toEqual(expect.any(String));
    });

    it('returns 409 MENU_CHANGED with the changes', async () => {
      await app.get(MenuService).updateItem(tea.id, { isAvailable: false });

      const response = await post(orderBody());

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        code: ApiErrorCode.MenuChanged,
        message: ORDER_MESSAGES.menuChanged
      });
      expect(response.body.changes).toEqual([
        { kind: CartChangeKind.Unavailable, itemId: tea.id },
        { kind: CartChangeKind.DiscountTooHigh, maxDiscount: 0 }
      ]);
    });

    it.each(['Idempotency-Key', 'X-Client-Id'])('rejects a missing %s header', async (header) => {
      const headers: Record<string, string> = { 'Idempotency-Key': KEY, 'X-Client-Id': CLIENT_ID };
      delete headers[header];

      const response = await request(server()).post('/api/orders').set(headers).send(orderBody());

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(ApiErrorCode.Validation);
      expect(response.body.fields[header]).toBeDefined();
    });

    it('rejects a key that is not a UUID', async () => {
      const response = await post(orderBody(), 'abc');

      expect(response.status).toBe(400);
      expect(response.body.fields['Idempotency-Key']).toBeDefined();
    });

    describe('open-price limits', () => {
      function cakeOrder(unitPrice: number): object {
        return {
          lines: [{ itemId: cake.id, quantity: 1, unitPrice, isOpenPrice: true, itemVersion: 1 }],
          discount: 0
        };
      }

      it.each([1, 1_000_000])('accepts %i cents', async (unitPrice) => {
        const response = await post(cakeOrder(unitPrice));

        expect(response.status).toBe(201);
        expect(response.body.lines[0]).toMatchObject({ unitPrice, isOpenPrice: true });
      });

      it.each([
        [0, ORDER_MESSAGES.amountTooLow],
        [-100, ORDER_MESSAGES.amountTooLow],
        [1_000_001, ORDER_MESSAGES.amountTooHigh],
        [10.5, ORDER_MESSAGES.amountInvalid]
      ])('rejects %d cents', async (unitPrice, message) => {
        const response = await post(cakeOrder(unitPrice));

        expect(response.status).toBe(400);
        expect(response.body.code).toBe(ApiErrorCode.Validation);
        expect(response.body.fields['lines.0.unitPrice']).toContain(message);
      });
    });

    it.each([
      ['no lines', { lines: [] }, 'lines'],
      ['lines that are not a list', { lines: 'tea' }, 'lines'],
      ['a negative discount', { discount: -1 }, 'discount'],
      ['a fractional discount', { discount: 1.5 }, 'discount'],
      ['a missing discount', { discount: undefined }, 'discount']
    ])('rejects %s', async (_name, overrides, field) => {
      const response = await post(orderBody(overrides));

      expect(response.status).toBe(400);
      expect(response.body.fields[field]).toBeDefined();
      expect(adminEvents).toEqual([]);
    });

    it.each([
      ['a quantity of 0', { quantity: 0 }, 'quantity'],
      ['a quantity of 100', { quantity: 100 }, 'quantity'],
      ['a fractional quantity', { quantity: 1.5 }, 'quantity'],
      ['a bad item id', { itemId: 'abc' }, 'itemId'],
      ['a bad item version', { itemVersion: 0 }, 'itemVersion'],
      ['a missing open-price flag', { isOpenPrice: undefined }, 'isOpenPrice'],
      ['a non-boolean open-price flag', { isOpenPrice: 'yes' }, 'isOpenPrice']
    ])('rejects %s', async (_name, overrides, field) => {
      const line = {
        itemId: tea.id,
        quantity: 1,
        unitPrice: 450,
        isOpenPrice: false,
        itemVersion: 1,
        ...overrides
      };

      const response = await post(orderBody({ lines: [line], discount: 0 }));

      expect(response.status).toBe(400);
      expect(response.body.fields[`lines.0.${field}`]).toBeDefined();
    });

    it('accepts a quantity of 99', async () => {
      const line = {
        itemId: tea.id,
        quantity: 99,
        unitPrice: 450,
        isOpenPrice: false,
        itemVersion: 1
      };

      const response = await post(orderBody({ lines: [line], discount: 0 }));

      expect(response.status).toBe(201);
      expect(response.body.subtotal).toBe(44_550);
    });
  });

  describe('GET /api/orders', () => {
    it('returns all orders with the seq', async () => {
      const own = await placeOrder();
      const other = await placeOrder(OTHER_KEY, OTHER_CLIENT_ID);

      const response = await request(server()).get('/api/orders');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        orders: [other, own],
        seq: app.get(EventsService).currentSeq
      });
    });
  });

  describe('GET /api/orders/mine', () => {
    it('returns only the orders of that client', async () => {
      const own = await placeOrder();
      await placeOrder(OTHER_KEY, OTHER_CLIENT_ID);

      const response = await request(server())
        .get('/api/orders/mine')
        .set('X-Client-Id', CLIENT_ID);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        orders: [own],
        seq: app.get(EventsService).currentSeq
      });
    });

    it('requires X-Client-Id', async () => {
      const response = await request(server()).get('/api/orders/mine');

      expect(response.status).toBe(400);
      expect(response.body.fields['X-Client-Id']).toBeDefined();
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    function patch(id: string, body: object): request.Test {
      return request(server()).patch(`/api/orders/${id}/status`).send(body);
    }

    it('changes the status and streams it to admin and the owning customer', async () => {
      const order = await placeOrder();

      const response = await patch(order.id, {
        status: OrderStatus.Preparing,
        expectedVersion: order.version
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: OrderStatus.Preparing, version: 2 });
      const updates = [ServerEventType.OrderCreated, ServerEventType.OrderUpdated];
      expect(eventTypes(adminEvents)).toEqual(updates);
      expect(eventTypes(customerEvents)).toEqual(updates);
    });

    it('does not stream the change to other customers', async () => {
      const order = await placeOrder(OTHER_KEY, OTHER_CLIENT_ID);

      await patch(order.id, { status: OrderStatus.Preparing, expectedVersion: 1 });

      expect(eventTypes(adminEvents)).toHaveLength(2);
      expect(customerEvents).toEqual([]);
    });

    it('returns 409 VERSION_CONFLICT for the second of two changes', async () => {
      const order = await placeOrder();
      await patch(order.id, { status: OrderStatus.Preparing, expectedVersion: 1 });

      const response = await patch(order.id, { status: OrderStatus.Cancelled, expectedVersion: 1 });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe(ApiErrorCode.VersionConflict);
    });

    it('returns 422 INVALID_TRANSITION', async () => {
      const order = await placeOrder();

      const response = await patch(order.id, { status: OrderStatus.Ready, expectedVersion: 1 });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe(ApiErrorCode.InvalidTransition);
    });

    it('returns 404 NOT_FOUND', async () => {
      const response = await patch(KEY, { status: OrderStatus.Preparing, expectedVersion: 1 });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe(ApiErrorCode.NotFound);
    });

    it.each([
      ['an unknown status', { status: 'eaten', expectedVersion: 1 }, 'status'],
      ['a missing version', { status: OrderStatus.Preparing }, 'expectedVersion'],
      ['a version of 0', { status: OrderStatus.Preparing, expectedVersion: 0 }, 'expectedVersion']
    ])('rejects %s', async (_name, body, field) => {
      const order = await placeOrder();

      const response = await patch(order.id, body);

      expect(response.status).toBe(400);
      expect(response.body.fields[field]).toBeDefined();
    });
  });
});
