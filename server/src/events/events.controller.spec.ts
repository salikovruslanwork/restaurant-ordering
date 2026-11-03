import { finalize } from 'rxjs';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiErrorCode,
  OrderStatus,
  ServerEventType,
  type EventEnvelope,
  type Order,
  type ServerEvent
} from '@restaurant/contracts';

import { AppModule } from '../app.module.js';
import { configureApp } from '../app.setup.js';
import { EVENTS_OPTIONS } from './events.config.js';
import { EventsService } from './events.service.js';

const CLIENT_ID = '3f2b8c1e-7a4d-4e6f-9b0a-1c2d3e4f5a6b';
const OTHER_CLIENT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const FAST_HEARTBEAT_MS = 20;
const SLOW_HEARTBEAT_MS = 60_000;

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

function isEnvelope(value: unknown): value is EventEnvelope {
  return typeof value === 'object' && value !== null && 'seq' in value && 'event' in value;
}

class SseConnection {
  private text = '';

  constructor(
    readonly response: Response,
    private readonly controller: AbortController
  ) {
    void this.read();
  }

  get pings(): number {
    return this.frames.filter((frame) => frame === ': ping').length;
  }

  get ids(): string[] {
    return this.frames.flatMap((frame) => frame.match(/^id: (.+)$/m)?.[1] ?? []);
  }

  get envelopes(): EventEnvelope[] {
    return this.frames.flatMap((frame) => {
      const data = frame.match(/^data: (.+)$/m)?.[1];
      const parsed: unknown = data === undefined ? null : JSON.parse(data);
      return isEnvelope(parsed) ? [parsed] : [];
    });
  }

  close(): void {
    this.controller.abort();
  }

  private get frames(): string[] {
    return this.text.split('\n\n').map((frame) => frame.trim());
  }

  private async read(): Promise<void> {
    const decoder = new TextDecoder();
    try {
      for await (const chunk of this.response.body ?? []) {
        this.text += decoder.decode(chunk, { stream: true });
      }
    } catch {
      // Aborted by close().
    }
  }
}

describe('EventsController', () => {
  let app: NestExpressApplication;
  let events: EventsService;
  let baseUrl: string;
  const connections: SseConnection[] = [];

  async function startApp(heartbeatIntervalMs = FAST_HEARTBEAT_MS, logSize = 5): Promise<void> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EVENTS_OPTIONS)
      .useValue({ logSize, heartbeatIntervalMs })
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.listen(0);
    events = app.get(EventsService);
    baseUrl = await app.getUrl();
  }

  async function connect(
    path: string,
    headers: Record<string, string> = {}
  ): Promise<SseConnection> {
    const controller = new AbortController();
    const response = await fetch(`${baseUrl}${path}`, { headers, signal: controller.signal });
    const connection = new SseConnection(response, controller);
    connections.push(connection);
    return connection;
  }

  afterEach(async () => {
    connections.splice(0).forEach((connection) => connection.close());
    await app.close();
  });

  describe('heartbeat', () => {
    it.each([
      ['admin', '/api/events/admin'],
      ['customer', `/api/events/customer?clientId=${CLIENT_ID}`]
    ])('sends ping comments on the %s stream', async (_name, path) => {
      await startApp();

      const connection = await connect(path);

      await vi.waitFor(() => expect(connection.pings).toBeGreaterThanOrEqual(2));
      expect(connection.envelopes).toEqual([]);
      expect(connection.ids).toEqual([]);
    });

    it('stops the stream when the client disconnects', async () => {
      await startApp();
      const onClosed = vi.fn();
      const original = events.adminStream.bind(events);
      vi.spyOn(events, 'adminStream').mockImplementation((since) =>
        original(since).pipe(finalize(onClosed))
      );
      const connection = await connect('/api/events/admin');
      await vi.waitFor(() => expect(connection.pings).toBeGreaterThanOrEqual(1));

      connection.close();

      await vi.waitFor(() => expect(onClosed).toHaveBeenCalledOnce());
    });
  });

  it('opens the stream at once, uncompressed, without waiting for the first heartbeat', async () => {
    await startApp(SLOW_HEARTBEAT_MS);

    const connection = await connect('/api/events/admin', { 'Accept-Encoding': 'gzip' });

    expect(connection.response.status).toBe(200);
    expect(connection.response.headers.get('content-type')).toContain('text/event-stream');
    expect(connection.response.headers.get('content-encoding')).toBeNull();
  });

  describe('streams', () => {
    it('sends the envelope as data and its seq as the event id', async () => {
      await startApp();
      const connection = await connect('/api/events/admin');
      await vi.waitFor(() => expect(connection.pings).toBeGreaterThanOrEqual(1));

      const envelope = events.publish(menuEvent);

      await vi.waitFor(() => expect(connection.envelopes).toEqual([envelope]));
      expect(connection.ids).toEqual([String(envelope.seq)]);
    });

    it('filters orders by clientId on the customer stream only', async () => {
      await startApp();
      const admin = await connect('/api/events/admin');
      const customer = await connect(`/api/events/customer?clientId=${CLIENT_ID}`);
      await vi.waitFor(() => {
        expect(admin.pings).toBeGreaterThanOrEqual(1);
        expect(customer.pings).toBeGreaterThanOrEqual(1);
      });

      const own = events.publish(orderEvent(CLIENT_ID));
      const other = events.publish(orderEvent(OTHER_CLIENT_ID));

      await vi.waitFor(() => expect(admin.envelopes).toEqual([own, other]));
      await vi.waitFor(() => expect(customer.envelopes).toEqual([own]));
    });
  });

  describe('replay', () => {
    it('replays from ?since=', async () => {
      await startApp();
      const first = events.publish(menuEvent);
      const missed = events.publish(menuEvent);

      const connection = await connect(`/api/events/admin?since=${first.seq}`);

      await vi.waitFor(() => expect(connection.envelopes).toEqual([missed]));
    });

    it('prefers Last-Event-ID over ?since= on reconnect', async () => {
      await startApp();
      const first = events.publish(menuEvent);
      const second = events.publish(menuEvent);
      const missed = events.publish(menuEvent);

      const connection = await connect(`/api/events/admin?since=${first.seq}`, {
        'Last-Event-ID': String(second.seq)
      });

      await vi.waitFor(() => expect(connection.envelopes).toEqual([missed]));
    });

    it('falls back to ?since= when Last-Event-ID is not a number', async () => {
      await startApp();
      const first = events.publish(menuEvent);
      const missed = events.publish(menuEvent);

      const connection = await connect(`/api/events/admin?since=${first.seq}`, {
        'Last-Event-ID': 'nonsense'
      });

      await vi.waitFor(() => expect(connection.envelopes).toEqual([missed]));
    });

    it('sends resync when the gap is too old', async () => {
      await startApp(FAST_HEARTBEAT_MS, 1);
      const start = events.currentSeq;
      events.publish(menuEvent);
      events.publish(menuEvent);

      const connection = await connect(`/api/events/customer?clientId=${CLIENT_ID}&since=${start}`);

      await vi.waitFor(() =>
        expect(connection.envelopes.map(({ event }) => event.type)).toEqual([
          ServerEventType.Resync
        ])
      );
    });
  });

  describe('validation', () => {
    it.each([
      ['a missing clientId', '/api/events/customer', 'clientId'],
      ['a clientId that is not a UUID', '/api/events/customer?clientId=abc', 'clientId'],
      ['a since that is not a number', '/api/events/admin?since=abc', 'since'],
      ['a negative since', '/api/events/admin?since=-1', 'since']
    ])('rejects %s with an ApiError', async (_name, path, field) => {
      await startApp();

      const response = await fetch(`${baseUrl}${path}`);
      const body: unknown = await response.json();

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        code: ApiErrorCode.Validation,
        fields: { [field]: expect.any(Array) }
      });
    });
  });

  it('serves the streams under the /api prefix only', async () => {
    await startApp();

    const response = await fetch(`${baseUrl}/events/admin`);

    expect(response.status).toBe(404);
  });
});
