import { TestBed } from '@angular/core/testing';

import type { Subscription } from 'rxjs';

import { ServerEventType, type EventEnvelope } from '@restaurant/contracts';

import { REALTIME_STREAM } from '../config/realtime.config';
import {
  RealtimeMessageKind,
  RealtimeStream,
  type RealtimeMessage
} from '../models/realtime.model';
import { FakeEventSource } from '../testing/fake-event-source';
import { ClientIdService } from './client-id.service';
import { RealtimeService } from './realtime.service';

const CONNECTING = 0;

function envelope(seq: number): EventEnvelope {
  return {
    seq,
    at: '2026-11-01T00:00:00.000Z',
    event: { type: ServerEventType.ItemDeleted, id: 'item-1' }
  };
}

describe('RealtimeService', () => {
  let subscription: Subscription | undefined;
  let received: RealtimeMessage[];

  function connect(stream: RealtimeStream, since = 10): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: REALTIME_STREAM, useValue: stream },
        { provide: ClientIdService, useValue: { id: 'client-1' } }
      ]
    });
    subscription = TestBed.inject(RealtimeService)
      .connect(since)
      .subscribe((message) => received.push(message));
  }

  beforeEach(() => {
    received = [];
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.useFakeTimers();
  });

  afterEach(() => {
    subscription?.unsubscribe();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens nothing until subscribed', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: REALTIME_STREAM, useValue: RealtimeStream.Admin }]
    });

    TestBed.inject(RealtimeService).connect(10);

    expect(FakeEventSource.instances).toEqual([]);
  });

  it('opens the admin stream from since', () => {
    connect(RealtimeStream.Admin);

    expect(FakeEventSource.latest.url).toBe('/api/events/admin?since=10');
  });

  it('opens the customer stream with the clientId', () => {
    connect(RealtimeStream.Customer);

    expect(FakeEventSource.latest.url).toBe('/api/events/customer?since=10&clientId=client-1');
  });

  it('reports the stream opening', () => {
    connect(RealtimeStream.Admin);

    FakeEventSource.latest.open();

    expect(received).toEqual([{ kind: RealtimeMessageKind.Opened }]);
  });

  it('passes on valid envelopes', () => {
    connect(RealtimeStream.Admin);

    FakeEventSource.latest.message(envelope(11));

    expect(received).toEqual([{ kind: RealtimeMessageKind.Envelope, envelope: envelope(11) }]);
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['JSON that is not an envelope', { seq: 'x' }]
  ])('logs and skips %s, and keeps going', (_name, data) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    connect(RealtimeStream.Admin);

    FakeEventSource.latest.message(data);
    FakeEventSource.latest.message(envelope(11));

    expect(warn).toHaveBeenCalledOnce();
    expect(received).toEqual([{ kind: RealtimeMessageKind.Envelope, envelope: envelope(11) }]);
  });

  it('reports a lost connection and leaves the reconnect to the browser while CONNECTING', () => {
    connect(RealtimeStream.Admin);
    const source = FakeEventSource.latest;

    source.fail(CONNECTING);
    vi.advanceTimersByTime(60_000);

    expect(received).toEqual([{ kind: RealtimeMessageKind.Lost }]);
    expect(FakeEventSource.instances).toEqual([source]);
    expect(source.readyState).toBe(CONNECTING);
  });

  it('reopens from the last seq after the browser gives up', () => {
    connect(RealtimeStream.Admin);
    const first = FakeEventSource.latest;
    first.open();
    first.message(envelope(15));

    first.fail(FakeEventSource.CLOSED);
    expect(received.at(-1)).toEqual({ kind: RealtimeMessageKind.Lost });
    expect(FakeEventSource.instances).toHaveLength(1);
    vi.advanceTimersByTime(1000);

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.latest.url).toBe('/api/events/admin?since=15');
  });

  it('backs off while reopening keeps failing, and starts over after a success', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    connect(RealtimeStream.Admin);

    FakeEventSource.latest.fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(999);
    expect(FakeEventSource.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(2);

    FakeEventSource.latest.fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(1999);
    expect(FakeEventSource.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(3);

    FakeEventSource.latest.open();
    FakeEventSource.latest.fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(1000);
    expect(FakeEventSource.instances).toHaveLength(4);
  });

  it('closes the source on unsubscribe and stops reopening', () => {
    connect(RealtimeStream.Admin);
    const source = FakeEventSource.latest;

    subscription?.unsubscribe();
    vi.advanceTimersByTime(60_000);

    expect(source.readyState).toBe(FakeEventSource.CLOSED);
    expect(FakeEventSource.instances).toEqual([source]);
  });
});
