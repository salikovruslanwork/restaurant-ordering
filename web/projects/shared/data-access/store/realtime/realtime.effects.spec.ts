import { TestBed } from '@angular/core/testing';

import { finalize, NEVER, of, Subject, type Observable, type Subscription } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ServerEventType, type EventEnvelope } from '@restaurant/contracts';

import { STREAM_RESTART_THROTTLE_MS } from '../../config/realtime.config';
import { RealtimeMessageKind, type RealtimeMessage } from '../../models/realtime.model';
import { RealtimeService } from '../../services/realtime.service';
import { connectionActions } from '../connection/connection.actions';
import { menuActions } from '../menu/menu.actions';
import { menuFeature } from '../menu/menu.reducer';
import { realtimeActions } from './realtime.actions';
import { RealtimeEffects } from './realtime.effects';

const snapshot = { categories: [], items: [], seq: 50 };

describe('RealtimeEffects', () => {
  let actions$: Subject<Action>;
  let connect: ReturnType<typeof vi.fn<(since: number) => Observable<RealtimeMessage>>>;
  let received: Action[];
  let subscription: Subscription;

  function start(seq: number | null = 60): void {
    TestBed.configureTestingModule({
      providers: [
        RealtimeEffects,
        provideMockActions(() => actions$),
        provideMockStore({ selectors: [{ selector: menuFeature.selectSeq, value: seq }] }),
        { provide: RealtimeService, useValue: { connect } }
      ]
    });
    subscription = TestBed.inject(RealtimeEffects).stream$.subscribe((action) =>
      received.push(action)
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
    actions$ = new Subject<Action>();
    connect = vi.fn(() => NEVER);
    received = [];
  });

  afterEach(() => {
    subscription.unsubscribe();
    TestBed.inject(MockStore).resetSelectors();
    vi.useRealTimers();
  });

  it('opens the stream from the snapshot seq', () => {
    start();

    actions$.next(menuActions.loadSucceeded({ snapshot }));

    expect(connect).toHaveBeenCalledExactlyOnceWith(50);
  });

  it('turns stream messages into actions', () => {
    const envelope: EventEnvelope = {
      seq: 51,
      at: '2026-11-01T00:00:00.000Z',
      event: { type: ServerEventType.Resync }
    };
    connect = vi.fn(() =>
      of<RealtimeMessage[]>(
        { kind: RealtimeMessageKind.Opened },
        { kind: RealtimeMessageKind.Envelope, envelope },
        { kind: RealtimeMessageKind.Lost }
      )
    );
    start();

    actions$.next(menuActions.loadSucceeded({ snapshot }));

    expect(received).toEqual([
      realtimeActions.streamOpened(),
      realtimeActions.eventReceived({ envelope }),
      realtimeActions.streamLost()
    ]);
  });

  it('replaces the running stream after a new snapshot', () => {
    const streams = [new Subject<RealtimeMessage>(), new Subject<RealtimeMessage>()];
    connect = vi.fn(() => streams[connect.mock.calls.length - 1] ?? NEVER);
    start();

    actions$.next(menuActions.loadSucceeded({ snapshot }));
    actions$.next(menuActions.loadSucceeded({ snapshot: { ...snapshot, seq: 70 } }));

    expect(connect).toHaveBeenLastCalledWith(70);
    expect(streams[0]?.observed).toBe(false);
    expect(streams[1]?.observed).toBe(true);
  });

  it('closes the stream when the browser goes offline and reopens it when it is back', () => {
    const closed = vi.fn();
    connect = vi.fn(() => NEVER.pipe(finalize(closed)));
    start();
    actions$.next(menuActions.loadSucceeded({ snapshot }));

    actions$.next(connectionActions.browserOffline());
    expect(closed).toHaveBeenCalledOnce();

    actions$.next(connectionActions.browserOnline());
    expect(connect).toHaveBeenLastCalledWith(60);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('restarts from the stored seq when the browser comes back', () => {
    start();

    actions$.next(connectionActions.browserOnline());

    expect(connect).toHaveBeenCalledExactlyOnceWith(60);
  });

  it('restarts from the stored seq after a request with no response', () => {
    start();

    actions$.next(connectionActions.requestNoResponse());

    expect(connect).toHaveBeenCalledExactlyOnceWith(60);
  });

  it('limits restarts while requests keep failing', () => {
    start();

    actions$.next(connectionActions.requestNoResponse());
    actions$.next(connectionActions.requestNoResponse());
    expect(connect).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(STREAM_RESTART_THROTTLE_MS);
    actions$.next(connectionActions.requestNoResponse());
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['the browser comes back', connectionActions.browserOnline()],
    ['a request gets no response', connectionActions.requestNoResponse()]
  ])('opens nothing before the first snapshot when %s', (_name, action) => {
    start(null);

    actions$.next(action);

    expect(connect).not.toHaveBeenCalled();
  });
});
