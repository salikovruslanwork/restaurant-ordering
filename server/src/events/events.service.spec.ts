import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OrderStatus,
  ServerEventType,
  type EventEnvelope,
  type Order,
  type ServerEvent
} from '@restaurant/contracts';

import { EventsService } from './events.service.js';

const LOG_SIZE = 3;
const CLIENT_ID = 'client-1';
const OTHER_CLIENT_ID = 'client-2';

const menuEvent: ServerEvent = { type: ServerEventType.CategoryDeleted, id: 'category-1' };

function orderEvent(clientId: string): ServerEvent {
  const order: Order = {
    id: `order-${clientId}`,
    number: 1042,
    clientId,
    lines: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    status: OrderStatus.Placed,
    version: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z'
  };
  return { type: ServerEventType.OrderCreated, order };
}

function createService(): EventsService {
  return new EventsService({ logSize: LOG_SIZE, heartbeatIntervalMs: 1000 });
}

function collectAdmin(service: EventsService, since: number | null): EventEnvelope[] {
  const received: EventEnvelope[] = [];
  service.adminStream(since).subscribe((envelope) => received.push(envelope));
  return received;
}

function collectCustomer(service: EventsService, since: number | null): EventEnvelope[] {
  const received: EventEnvelope[] = [];
  service.customerStream(CLIENT_ID, since).subscribe((envelope) => received.push(envelope));
  return received;
}

describe('EventsService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('publish', () => {
    it('gives every event the next seq', () => {
      const service = createService();
      const start = service.currentSeq;

      const first = service.publish(menuEvent);
      const second = service.publish(menuEvent);

      expect(first.seq).toBe(start + 1);
      expect(second.seq).toBe(start + 2);
      expect(service.currentSeq).toBe(start + 2);
      expect(first.event).toEqual(menuEvent);
      expect(new Date(first.at).toISOString()).toBe(first.at);
    });
  });

  describe('replay', () => {
    it('sends only live events when there is no since', () => {
      const service = createService();
      service.publish(menuEvent);

      const received = collectAdmin(service, null);
      const live = service.publish(menuEvent);

      expect(received).toEqual([live]);
    });

    it('replays nothing and sends no resync when the client is up to date', () => {
      const service = createService();
      service.publish(menuEvent);

      expect(collectAdmin(service, service.currentSeq)).toEqual([]);
    });

    it('sends nothing when no event was ever published and since is the snapshot seq', () => {
      const service = createService();

      expect(collectAdmin(service, service.currentSeq)).toEqual([]);
    });

    it('replays the missed events, then continues live and in order', () => {
      const service = createService();
      const first = service.publish(menuEvent);
      const missed = service.publish(menuEvent);

      const received = collectAdmin(service, first.seq);
      const live = service.publish(menuEvent);

      expect(received).toEqual([missed, live]);
    });

    it('keeps only the newest events in the log', () => {
      const service = createService();
      const start = service.currentSeq;
      const envelopes = Array.from({ length: LOG_SIZE + 1 }, () => service.publish(menuEvent));

      expect(collectAdmin(service, start + 1)).toEqual(envelopes.slice(1));
    });
  });

  describe('resync', () => {
    function expectSingleResync(received: EventEnvelope[], service: EventsService): void {
      expect(received).toHaveLength(1);
      expect(received[0]?.event).toEqual({ type: ServerEventType.Resync });
      expect(received[0]?.seq).toBe(service.currentSeq);
    }

    it('is sent when the gap is older than the log', () => {
      const service = createService();
      const start = service.currentSeq;
      Array.from({ length: LOG_SIZE + 1 }, () => service.publish(menuEvent));

      expectSingleResync(collectAdmin(service, start), service);
    });

    it('is sent when since is ahead of the server', () => {
      const service = createService();
      service.publish(menuEvent);

      expectSingleResync(collectAdmin(service, service.currentSeq + 1), service);
    });

    it('is sent when the log is empty and since is older', () => {
      const service = createService();

      expectSingleResync(collectAdmin(service, service.currentSeq - 1), service);
    });

    it('is sent to a client that reconnects after a server restart', () => {
      vi.useFakeTimers({ now: new Date('2026-11-01T10:00:00.000Z') });
      const beforeRestart = createService();
      const lastSeen = beforeRestart.publish(menuEvent).seq;

      vi.setSystemTime(new Date('2026-11-01T10:00:10.000Z'));
      const afterRestart = createService();
      afterRestart.publish(menuEvent);

      expectSingleResync(collectAdmin(afterRestart, lastSeen), afterRestart);
    });

    it('does not use up a seq and is not replayed later', () => {
      const service = createService();
      const start = service.currentSeq;
      service.publish(menuEvent);
      const before = service.currentSeq;

      collectAdmin(service, start - 1);

      expect(service.currentSeq).toBe(before);
      expect(collectAdmin(service, start).map(({ event }) => event.type)).toEqual([
        ServerEventType.CategoryDeleted
      ]);
    });

    it('continues live after the resync', () => {
      const service = createService();
      const received = collectAdmin(service, service.currentSeq - 1);

      const live = service.publish(menuEvent);

      expect(received.at(-1)).toEqual(live);
    });
  });

  describe('stream filtering', () => {
    it('sends every order to the admin stream', () => {
      const service = createService();
      const received = collectAdmin(service, null);

      service.publish(orderEvent(CLIENT_ID));
      service.publish(orderEvent(OTHER_CLIENT_ID));

      expect(received).toHaveLength(2);
    });

    it('sends the customer menu events and only their own orders', () => {
      const service = createService();
      const received = collectCustomer(service, null);

      const menu = service.publish(menuEvent);
      const own = service.publish(orderEvent(CLIENT_ID));
      service.publish(orderEvent(OTHER_CLIENT_ID));

      expect(received).toEqual([menu, own]);
    });

    it('also filters order updates', () => {
      const service = createService();
      const received = collectCustomer(service, null);
      const created = orderEvent(OTHER_CLIENT_ID);
      if (created.type !== ServerEventType.OrderCreated) {
        throw new Error('Expected an order event');
      }

      service.publish({ type: ServerEventType.OrderUpdated, order: created.order });

      expect(received).toEqual([]);
    });

    it('filters replayed events too', () => {
      const service = createService();
      const start = service.currentSeq;
      const own = service.publish(orderEvent(CLIENT_ID));
      service.publish(orderEvent(OTHER_CLIENT_ID));

      expect(collectCustomer(service, start)).toEqual([own]);
    });

    it('passes resync to the customer', () => {
      const service = createService();

      const received = collectCustomer(service, service.currentSeq - 1);

      expect(received.map(({ event }) => event.type)).toEqual([ServerEventType.Resync]);
    });
  });

  it('stops delivering after unsubscribe', () => {
    const service = createService();
    const received: EventEnvelope[] = [];
    const subscription = service.adminStream(null).subscribe((envelope) => received.push(envelope));

    subscription.unsubscribe();
    service.publish(menuEvent);

    expect(received).toEqual([]);
  });
});
