import { beforeEach, describe, expect, it } from 'vitest';

import {
  ApiErrorCode,
  CartChangeKind,
  OrderStatus,
  PricingKind,
  ServerEventType,
  type ApiError,
  type CartChange,
  type EventEnvelope,
  type MenuItem,
  type Order,
  type PlaceOrderRequest
} from '@restaurant/contracts';

import { ApiException } from '../common/index.js';
import { EventsService } from '../events/index.js';
import { IdempotencyService } from '../idempotency/index.js';
import { InMemoryMenuRepository } from '../menu/in-memory-menu.repository.js';
import { MenuService } from '../menu/index.js';
import { InMemoryOrdersRepository } from './in-memory-orders.repository.js';
import { FIRST_ORDER_NUMBER, ORDER_TRANSITIONS } from './orders.config.js';
import { OrdersService } from './orders.service.js';

const CLIENT_ID = 'client-1';
const OTHER_CLIENT_ID = 'client-2';
const MISSING_ID = '00000000-0000-4000-8000-999999999999';

describe('OrdersService', () => {
  let service: OrdersService;
  let menu: MenuService;
  let events: EventsService;
  let published: EventEnvelope[];
  let tea: MenuItem;
  let cake: MenuItem;
  let keyNumber: number;

  function nextKey(): string {
    keyNumber += 1;
    return `key-${keyNumber}`;
  }

  function teaLine(quantity = 2, unitPrice = 450): PlaceOrderRequest['lines'][number] {
    return { itemId: tea.id, quantity, unitPrice, isOpenPrice: false, itemVersion: tea.version };
  }

  function cakeLine(unitPrice = 2500, quantity = 1): PlaceOrderRequest['lines'][number] {
    return { itemId: cake.id, quantity, unitPrice, isOpenPrice: true, itemVersion: cake.version };
  }

  function place(request: PlaceOrderRequest, clientId = CLIENT_ID): Promise<Order> {
    return service.placeOrder(clientId, nextKey(), request);
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

  async function changesOf(request: PlaceOrderRequest): Promise<CartChange[]> {
    const { status, error } = await errorOf(place(request));
    if (error.code !== ApiErrorCode.MenuChanged) {
      throw new Error(`Expected MENU_CHANGED, got ${error.code}`);
    }
    expect(status).toBe(409);
    return error.changes;
  }

  beforeEach(async () => {
    keyNumber = 0;
    events = new EventsService({ logSize: 100, heartbeatIntervalMs: 1000 });
    menu = new MenuService(new InMemoryMenuRepository({ categories: [], items: [] }), events);
    service = new OrdersService(
      new InMemoryOrdersRepository(),
      menu,
      events,
      new IdempotencyService()
    );

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

    published = [];
    events.adminStream(null).subscribe((envelope) => published.push(envelope));
  });

  describe('placing an order', () => {
    it('computes the lines and totals on the server', async () => {
      const order = await place({ lines: [teaLine(2), cakeLine(2500)], discount: 300 });

      expect(order).toMatchObject({
        number: FIRST_ORDER_NUMBER,
        clientId: CLIENT_ID,
        subtotal: 3400,
        discount: 300,
        total: 3100,
        status: OrderStatus.Placed,
        version: 1
      });
      expect(order.lines).toEqual([
        {
          itemId: tea.id,
          name: 'Oolong',
          unitPrice: 450,
          isOpenPrice: false,
          quantity: 2,
          lineTotal: 900
        },
        {
          itemId: cake.id,
          name: 'Custom cake',
          unitPrice: 2500,
          isOpenPrice: true,
          quantity: 1,
          lineTotal: 2500
        }
      ]);
    });

    it('numbers orders one after another', async () => {
      const first = await place({ lines: [teaLine()], discount: 0 });
      const second = await place({ lines: [teaLine()], discount: 0 });

      expect(second.number).toBe(first.number + 1);
      expect(second.id).not.toBe(first.id);
    });

    it('publishes order.created', async () => {
      const order = await place({ lines: [teaLine()], discount: 0 });

      expect(published.map(({ event }) => event)).toEqual([
        { type: ServerEventType.OrderCreated, order }
      ]);
    });

    it('keeps the name and price from order time when the item changes or is deleted', async () => {
      const order = await place({ lines: [teaLine()], discount: 0 });

      await menu.updateItem(tea.id, { name: 'Renamed' });
      await menu.deleteItem(tea.id);

      const { orders } = await service.listAll();
      expect(orders[0]?.lines[0]).toEqual(order.lines[0]);
      expect(orders[0]?.lines[0]?.name).toBe('Oolong');
    });

    it('accepts an open-price item at the customer price, in two lines at two prices', async () => {
      const order = await place({ lines: [cakeLine(1000), cakeLine(2000)], discount: 0 });

      expect(order.lines.map(({ unitPrice }) => unitPrice)).toEqual([1000, 2000]);
      expect(order.subtotal).toBe(3000);
    });

    it('accepts an unrelated item edit, since the price did not change', async () => {
      await menu.updateItem(tea.id, { description: 'New text' });

      const order = await place({ lines: [teaLine()], discount: 0 });

      expect(order.lines[0]?.unitPrice).toBe(450);
    });
  });

  describe('discount cap', () => {
    it('allows a discount equal to the subtotal, for a $0 order', async () => {
      const order = await place({ lines: [teaLine(2)], discount: 900 });

      expect(order.total).toBe(0);
    });

    it('rejects a discount above the subtotal and reports the maximum', async () => {
      const changes = await changesOf({ lines: [teaLine(2)], discount: 901 });

      expect(changes).toEqual([{ kind: CartChangeKind.DiscountTooHigh, maxDiscount: 900 }]);
    });

    it('caps at the subtotal after a price drop', async () => {
      await menu.updateItem(tea.id, { pricing: { kind: PricingKind.Fixed, price: 100 } });

      const changes = await changesOf({ lines: [teaLine(2)], discount: 500 });

      expect(changes).toEqual([
        { kind: CartChangeKind.PriceChanged, itemId: tea.id, oldPrice: 450, newPrice: 100 },
        { kind: CartChangeKind.DiscountTooHigh, maxDiscount: 200 }
      ]);
    });

    it('caps without the lines that are going away', async () => {
      await menu.updateItem(tea.id, { isAvailable: false });

      const changes = await changesOf({ lines: [teaLine(2), cakeLine(300)], discount: 500 });

      expect(changes).toEqual([
        { kind: CartChangeKind.Unavailable, itemId: tea.id },
        { kind: CartChangeKind.DiscountTooHigh, maxDiscount: 300 }
      ]);
    });
  });

  describe('menu changes', () => {
    it('reports a changed price and creates nothing', async () => {
      await menu.updateItem(tea.id, { pricing: { kind: PricingKind.Fixed, price: 500 } });
      published.length = 0;

      const changes = await changesOf({ lines: [teaLine()], discount: 0 });

      expect(changes).toEqual([
        { kind: CartChangeKind.PriceChanged, itemId: tea.id, oldPrice: 450, newPrice: 500 }
      ]);
      expect(published).toEqual([]);
      expect((await service.listAll()).orders).toEqual([]);
    });

    it('reports a client that sends a price below the menu price', async () => {
      const changes = await changesOf({ lines: [teaLine(1, 1)], discount: 0 });

      expect(changes).toEqual([
        { kind: CartChangeKind.PriceChanged, itemId: tea.id, oldPrice: 1, newPrice: 450 }
      ]);
    });

    it('reports an unavailable item', async () => {
      await menu.updateItem(tea.id, { isAvailable: false });

      expect(await changesOf({ lines: [teaLine()], discount: 0 })).toEqual([
        { kind: CartChangeKind.Unavailable, itemId: tea.id }
      ]);
    });

    it('reports an unavailable open-price item', async () => {
      await menu.updateItem(cake.id, { isAvailable: false });

      expect(await changesOf({ lines: [cakeLine()], discount: 0 })).toEqual([
        { kind: CartChangeKind.Unavailable, itemId: cake.id }
      ]);
    });

    it('reports a removed item', async () => {
      await menu.deleteItem(tea.id);

      expect(await changesOf({ lines: [teaLine()], discount: 0 })).toEqual([
        { kind: CartChangeKind.Removed, itemId: tea.id }
      ]);
    });

    it('removes a customer price for an item that now has a fixed price', async () => {
      await menu.updateItem(cake.id, { pricing: { kind: PricingKind.Fixed, price: 900 } });

      expect(await changesOf({ lines: [cakeLine(2500)], discount: 0 })).toEqual([
        { kind: CartChangeKind.Removed, itemId: cake.id }
      ]);
    });

    it('doesn’t take an old fixed price as the customer’s price once the item is open-price', async () => {
      await menu.updateItem(tea.id, { pricing: { kind: PricingKind.Open } });

      expect(await changesOf({ lines: [teaLine(2, 450)], discount: 0 })).toEqual([
        { kind: CartChangeKind.Removed, itemId: tea.id }
      ]);
    });

    it('caps the discount without a line whose pricing switched', async () => {
      await menu.updateItem(tea.id, { pricing: { kind: PricingKind.Open } });

      expect(await changesOf({ lines: [teaLine(2, 450), cakeLine(1000)], discount: 1500 })).toEqual(
        [
          { kind: CartChangeKind.Removed, itemId: tea.id },
          { kind: CartChangeKind.DiscountTooHigh, maxDiscount: 1000 }
        ]
      );
    });

    it('reports every change, once per item even with repeated lines', async () => {
      await menu.deleteItem(tea.id);
      await menu.updateItem(cake.id, { isAvailable: false });

      const changes = await changesOf({
        lines: [teaLine(), teaLine(), cakeLine(), cakeLine(100)],
        discount: 0
      });

      expect(changes).toEqual([
        { kind: CartChangeKind.Removed, itemId: tea.id },
        { kind: CartChangeKind.Unavailable, itemId: cake.id }
      ]);
    });
  });

  describe('idempotency', () => {
    it('returns one order and one event for the same key', async () => {
      const request = { lines: [teaLine()], discount: 0 };

      const first = await service.placeOrder(CLIENT_ID, 'key', request);
      const second = await service.placeOrder(CLIENT_ID, 'key', request);

      expect(second).toEqual(first);
      expect((await service.listAll()).orders).toHaveLength(1);
      expect(published).toHaveLength(1);
    });

    it('creates one order for a concurrent double submit', async () => {
      const request = { lines: [teaLine()], discount: 0 };

      const [first, second] = await Promise.all([
        service.placeOrder(CLIENT_ID, 'key', request),
        service.placeOrder(CLIENT_ID, 'key', request)
      ]);

      expect(second).toEqual(first);
      expect((await service.listAll()).orders).toHaveLength(1);
    });

    it('still returns the order on retry after the menu has changed', async () => {
      const request = { lines: [teaLine()], discount: 0 };
      const first = await service.placeOrder(CLIENT_ID, 'key', request);
      await menu.updateItem(tea.id, { pricing: { kind: PricingKind.Fixed, price: 999 } });

      expect(await service.placeOrder(CLIENT_ID, 'key', request)).toEqual(first);
    });

    it('treats a newer itemVersion alone as the same payload', async () => {
      const first = await service.placeOrder(CLIENT_ID, 'key', {
        lines: [teaLine()],
        discount: 0
      });

      const retry = await service.placeOrder(CLIENT_ID, 'key', {
        lines: [{ ...teaLine(), itemVersion: tea.version + 1 }],
        discount: 0
      });

      expect(retry).toEqual(first);
    });

    it.each<[string, () => { clientId: string; request: PlaceOrderRequest }]>([
      ['quantity', () => ({ clientId: CLIENT_ID, request: { lines: [teaLine(3)], discount: 0 } })],
      ['discount', () => ({ clientId: CLIENT_ID, request: { lines: [teaLine()], discount: 10 } })],
      [
        'client',
        () => ({ clientId: OTHER_CLIENT_ID, request: { lines: [teaLine()], discount: 0 } })
      ]
    ])('rejects the same key with a different %s', async (_name, change) => {
      await service.placeOrder(CLIENT_ID, 'key', { lines: [teaLine()], discount: 0 });
      const { clientId, request } = change();

      const { status, error } = await errorOf(service.placeOrder(clientId, 'key', request));

      expect(status).toBe(422);
      expect(error.code).toBe(ApiErrorCode.IdempotencyMismatch);
      expect((await service.listAll()).orders).toHaveLength(1);
    });

    it('allows a retry with the same key after MENU_CHANGED', async () => {
      await menu.updateItem(tea.id, { pricing: { kind: PricingKind.Fixed, price: 500 } });
      const stale = { lines: [teaLine()], discount: 0 };
      await errorOf(service.placeOrder(CLIENT_ID, 'key', stale));

      const order = await service.placeOrder(CLIENT_ID, 'key', {
        lines: [teaLine(2, 500)],
        discount: 0
      });

      expect(order.subtotal).toBe(1000);
    });
  });

  describe('listing', () => {
    it('lists all orders newest first with the current seq', async () => {
      const first = await place({ lines: [teaLine()], discount: 0 });
      const second = await place({ lines: [teaLine()], discount: 0 }, OTHER_CLIENT_ID);

      const snapshot = await service.listAll();

      expect(snapshot.orders).toEqual([second, first]);
      expect(snapshot.seq).toBe(events.currentSeq);
    });

    it('lists only the orders of one client', async () => {
      const own = await place({ lines: [teaLine()], discount: 0 });
      await place({ lines: [teaLine()], discount: 0 }, OTHER_CLIENT_ID);

      const snapshot = await service.listByClient(CLIENT_ID);

      expect(snapshot.orders).toEqual([own]);
      expect(snapshot.seq).toBe(events.currentSeq);
    });

    it('returns an empty list for a client with no orders', async () => {
      expect((await service.listByClient(CLIENT_ID)).orders).toEqual([]);
    });
  });

  describe('changing status', () => {
    const statuses = Object.values(OrderStatus);
    const allPairs = statuses.flatMap((from) => statuses.map((to) => [from, to] as const));

    // Walks a new order to the wanted status through the allowed path.
    async function orderAt(status: OrderStatus): Promise<Order> {
      const paths: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.Placed]: [],
        [OrderStatus.Preparing]: [OrderStatus.Preparing],
        [OrderStatus.Ready]: [OrderStatus.Preparing, OrderStatus.Ready],
        [OrderStatus.Cancelled]: [OrderStatus.Cancelled]
      };
      let order = await place({ lines: [teaLine()], discount: 0 });
      for (const next of paths[status]) {
        order = await service.changeStatus(order.id, {
          status: next,
          expectedVersion: order.version
        });
      }
      return order;
    }

    it('matches the status rules in the architecture', () => {
      expect(ORDER_TRANSITIONS).toEqual({
        placed: ['preparing', 'cancelled'],
        preparing: ['ready'],
        ready: [],
        cancelled: []
      });
    });

    it.each(allPairs)('from %s to %s follows the rules', async (from, to) => {
      const order = await orderAt(from);
      const action = service.changeStatus(order.id, { status: to, expectedVersion: order.version });

      if (ORDER_TRANSITIONS[from].includes(to)) {
        expect((await action).status).toBe(to);
      } else {
        const { status, error } = await errorOf(action);
        expect(status).toBe(422);
        expect(error.code).toBe(ApiErrorCode.InvalidTransition);
      }
    });

    it('bumps the version and publishes order.updated', async () => {
      const order = await orderAt(OrderStatus.Placed);
      published.length = 0;

      const updated = await service.changeStatus(order.id, {
        status: OrderStatus.Preparing,
        expectedVersion: 1
      });

      expect(updated).toEqual({
        ...order,
        status: OrderStatus.Preparing,
        version: 2,
        updatedAt: updated.updatedAt
      });
      expect(published.map(({ event }) => event)).toEqual([
        { type: ServerEventType.OrderUpdated, order: updated }
      ]);
    });

    it('returns VERSION_CONFLICT for a stale version and changes nothing', async () => {
      const order = await orderAt(OrderStatus.Preparing);
      published.length = 0;

      const { status, error } = await errorOf(
        service.changeStatus(order.id, { status: OrderStatus.Ready, expectedVersion: 1 })
      );

      expect(status).toBe(409);
      expect(error.code).toBe(ApiErrorCode.VersionConflict);
      expect(published).toEqual([]);
      expect((await service.listAll()).orders[0]).toEqual(order);
    });

    it('checks the version before the transition', async () => {
      const order = await orderAt(OrderStatus.Preparing);

      const { error } = await errorOf(
        service.changeStatus(order.id, { status: OrderStatus.Preparing, expectedVersion: 1 })
      );

      expect(error.code).toBe(ApiErrorCode.VersionConflict);
    });

    it('returns NOT_FOUND for an unknown order', async () => {
      const { status, error } = await errorOf(
        service.changeStatus(MISSING_ID, { status: OrderStatus.Preparing, expectedVersion: 1 })
      );

      expect(status).toBe(404);
      expect(error.code).toBe(ApiErrorCode.NotFound);
    });
  });
});
