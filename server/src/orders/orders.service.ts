import { randomUUID } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import {
  ApiErrorCode,
  CartChangeKind,
  OrderStatus,
  PricingKind,
  ServerEventType,
  type CartChange,
  type Cents,
  type ChangeOrderStatusRequest,
  type Id,
  type MenuItem,
  type Order,
  type OrderLine,
  type OrdersSnapshot,
  type PlaceOrderRequest
} from '@restaurant/contracts';

import { ApiException } from '../common/index.js';
import { EventsService } from '../events/index.js';
import { IdempotencyService } from '../idempotency/index.js';
import { MenuService } from '../menu/index.js';
import { ORDER_MESSAGES, ORDER_TRANSITIONS, ORDERS_REPOSITORY } from './orders.config.js';
import type { OrdersRepository } from './orders.repository.js';

type RequestLine = PlaceOrderRequest['lines'][number];

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY) private readonly repository: OrdersRepository,
    private readonly menu: MenuService,
    private readonly events: EventsService,
    private readonly idempotency: IdempotencyService
  ) {}

  placeOrder(clientId: Id, key: string, request: PlaceOrderRequest): Promise<Order> {
    return this.idempotency.execute(key, this.toPayload(clientId, request), () =>
      this.createOrder(clientId, request)
    );
  }

  async listAll(): Promise<OrdersSnapshot> {
    // Read before the data: an event in between is replayed, never lost.
    const seq = this.events.currentSeq;
    return { orders: this.newestFirst(await this.repository.list()), seq };
  }

  async listByClient(clientId: Id): Promise<OrdersSnapshot> {
    const seq = this.events.currentSeq;
    return { orders: this.newestFirst(await this.repository.listByClient(clientId)), seq };
  }

  async changeStatus(id: Id, request: ChangeOrderStatusRequest): Promise<Order> {
    const current = await this.repository.find(id);
    if (!current) {
      throw new ApiException(
        { code: ApiErrorCode.NotFound, message: ORDER_MESSAGES.orderNotFound },
        HttpStatus.NOT_FOUND
      );
    }
    // Version first: a stale client gets 409 and refetches, even if its target is no longer valid.
    if (current.version !== request.expectedVersion) {
      throw new ApiException(
        { code: ApiErrorCode.VersionConflict, message: ORDER_MESSAGES.versionConflict },
        HttpStatus.CONFLICT
      );
    }
    if (!ORDER_TRANSITIONS[current.status].includes(request.status)) {
      throw new ApiException(
        { code: ApiErrorCode.InvalidTransition, message: ORDER_MESSAGES.invalidTransition },
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    const order: Order = {
      ...current,
      status: request.status,
      version: current.version + 1,
      updatedAt: new Date().toISOString()
    };
    await this.repository.save(order);
    this.events.publish({ type: ServerEventType.OrderUpdated, order });
    return order;
  }

  private async createOrder(clientId: Id, request: PlaceOrderRequest): Promise<Order> {
    const items = await this.menu.findItems(request.lines.map(({ itemId }) => itemId));
    const changes = this.findChanges(request, items);
    if (changes.length > 0) {
      throw new ApiException(
        { code: ApiErrorCode.MenuChanged, message: ORDER_MESSAGES.menuChanged, changes },
        HttpStatus.CONFLICT
      );
    }

    const lines = request.lines.flatMap((line) => this.toOrderLine(line, items.get(line.itemId)));
    const subtotal = lines.reduce((sum, { lineTotal }) => sum + lineTotal, 0);
    const now = new Date().toISOString();
    const order: Order = {
      id: randomUUID(),
      number: await this.repository.nextOrderNumber(),
      clientId,
      lines,
      subtotal,
      discount: request.discount,
      total: subtotal - request.discount,
      status: OrderStatus.Placed,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    await this.repository.save(order);
    this.events.publish({ type: ServerEventType.OrderCreated, order });
    return order;
  }

  private findChanges(request: PlaceOrderRequest, items: Map<Id, MenuItem>): CartChange[] {
    const lineChanges = request.lines.flatMap((line) =>
      this.findLineChange(line, items.get(line.itemId))
    );
    const uniqueChanges = [...new Map(lineChanges.map((c) => [JSON.stringify(c), c])).values()];

    const maxDiscount = this.subtotalAfterChanges(request.lines, items);
    return request.discount > maxDiscount
      ? [...uniqueChanges, { kind: CartChangeKind.DiscountTooHigh, maxDiscount }]
      : uniqueChanges;
  }

  private findLineChange(line: RequestLine, item: MenuItem | undefined): CartChange[] {
    if (!item) {
      return [{ kind: CartChangeKind.Removed, itemId: line.itemId }];
    }
    if (!item.isAvailable) {
      return [{ kind: CartChangeKind.Unavailable, itemId: line.itemId }];
    }
    // A switch between fixed and open price has no kind of its own; the line can't stay as it is.
    if (line.isOpenPrice !== (item.pricing.kind === PricingKind.Open)) {
      return [{ kind: CartChangeKind.Removed, itemId: line.itemId }];
    }
    if (item.pricing.kind === PricingKind.Fixed && item.pricing.price !== line.unitPrice) {
      return [
        {
          kind: CartChangeKind.PriceChanged,
          itemId: line.itemId,
          oldPrice: line.unitPrice,
          newPrice: item.pricing.price
        }
      ];
    }
    return [];
  }

  // The cap the client will face once it has applied the other changes to its cart.
  private subtotalAfterChanges(lines: RequestLine[], items: Map<Id, MenuItem>): Cents {
    return lines.reduce((sum, line) => {
      const item = items.get(line.itemId);
      const isOpen = item?.pricing.kind === PricingKind.Open;
      if (!item?.isAvailable || line.isOpenPrice !== isOpen) {
        return sum;
      }
      const unitPrice =
        item.pricing.kind === PricingKind.Fixed ? item.pricing.price : line.unitPrice;
      return sum + unitPrice * line.quantity;
    }, 0);
  }

  private toOrderLine(line: RequestLine, item: MenuItem | undefined): OrderLine[] {
    return item
      ? [
          {
            itemId: item.id,
            name: item.name,
            unitPrice: line.unitPrice,
            isOpenPrice: item.pricing.kind === PricingKind.Open,
            quantity: line.quantity,
            lineTotal: line.unitPrice * line.quantity
          }
        ]
      : [];
  }

  // itemVersion is left out: an unrelated item edit must not turn a retry into a mismatch.
  private toPayload(clientId: Id, request: PlaceOrderRequest): string {
    return JSON.stringify({
      clientId,
      discount: request.discount,
      lines: request.lines.map(({ itemId, quantity, unitPrice, isOpenPrice }) => [
        itemId,
        quantity,
        unitPrice,
        isOpenPrice
      ])
    });
  }

  private newestFirst(orders: Order[]): Order[] {
    return orders.sort((a, b) => b.number - a.number);
  }
}
