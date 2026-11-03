import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Store } from '@ngrx/store';

import {
  PricingKind,
  ServerEventType,
  type EventEnvelope,
  type MenuItem,
  type MenuSnapshot,
  type ServerEvent
} from '@restaurant/contracts';

import { ConnectionStatus } from './models/connection.model';
import { LoadStatus } from './models/menu.model';
import { RealtimeStream } from './models/realtime.model';
import { provideDataAccess } from './provide-data-access';
import { connectionActions } from './store/connection/connection.actions';
import { connectionFeature } from './store/connection/connection.reducer';
import { menuFeature } from './store/menu/menu.reducer';
import { FakeEventSource } from './testing/fake-event-source';

const AT = '2026-11-01T00:00:00.000Z';

function item(id: string, version = 1): MenuItem {
  return {
    id,
    categoryId: 'tea',
    name: id,
    description: '',
    pricing: { kind: PricingKind.Fixed, price: 450 },
    isAvailable: true,
    version,
    updatedAt: AT
  };
}

function snapshot(seq: number, items: MenuItem[]): MenuSnapshot {
  return { categories: [{ id: 'tea', name: 'Tea', sortOrder: 0, version: 1 }], items, seq };
}

function envelope(seq: number, event: ServerEvent): EventEnvelope {
  return { seq, at: AT, event };
}

// The whole data layer together: only HTTP and EventSource are fake.
describe('data access', () => {
  let http: HttpTestingController;
  let store: Store;

  function respondWithMenu(seq: number, items: MenuItem[]): void {
    http.expectOne('/api/menu').flush(snapshot(seq, items));
  }

  const itemCount = () => store.selectSignal(menuFeature.selectItemCount)();
  const items = () => store.selectSignal(menuFeature.selectItemEntities)();
  const loadStatus = () => store.selectSignal(menuFeature.selectLoadStatus)();
  const connection = () => store.selectSignal(connectionFeature.selectStatus)();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(1);
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    TestBed.configureTestingModule({
      providers: [provideDataAccess(RealtimeStream.Customer), provideHttpClientTesting()]
    });
    store = TestBed.inject(Store);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads the snapshot, opens the stream from its seq and goes live', () => {
    expect(loadStatus()).toBe(LoadStatus.Loading);
    expect(FakeEventSource.instances).toEqual([]);

    respondWithMenu(100, [item('oolong')]);

    expect(loadStatus()).toBe(LoadStatus.Loaded);
    expect(itemCount()).toBe(1);
    expect(FakeEventSource.latest.url).toContain('/api/events/customer?since=100&clientId=');
    expect(connection()).toBe(ConnectionStatus.Reconnecting);

    FakeEventSource.latest.open();

    expect(connection()).toBe(ConnectionStatus.Live);
  });

  it('updates the store from live events', () => {
    respondWithMenu(100, [item('oolong')]);
    FakeEventSource.latest.open();

    FakeEventSource.latest.message(
      envelope(101, {
        type: ServerEventType.ItemUpserted,
        item: { ...item('oolong', 2), name: 'New' }
      })
    );
    FakeEventSource.latest.message(
      envelope(102, { type: ServerEventType.ItemUpserted, item: item('sencha') })
    );
    expect(itemCount()).toBe(2);
    expect(items()['oolong']?.name).toBe('New');

    FakeEventSource.latest.message(
      envelope(103, { type: ServerEventType.ItemDeleted, id: 'oolong' })
    );
    expect(itemCount()).toBe(1);
  });

  it('reloads on resync and reopens the stream from the new seq', () => {
    respondWithMenu(100, [item('oolong')]);
    const first = FakeEventSource.latest;
    first.open();

    first.message(envelope(500, { type: ServerEventType.Resync }));
    respondWithMenu(500, [item('sencha')]);

    expect(items()['oolong']).toBeUndefined();
    expect(items()['sencha']).toBeDefined();
    expect(first.readyState).toBe(FakeEventSource.CLOSED);
    expect(FakeEventSource.latest).not.toBe(first);
    expect(FakeEventSource.latest.url).toContain('since=500');
  });

  it('survives invalid stream messages', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    respondWithMenu(100, [item('oolong')]);

    FakeEventSource.latest.message('not json');
    FakeEventSource.latest.message(
      envelope(101, { type: ServerEventType.ItemDeleted, id: 'oolong' })
    );

    expect(warn).toHaveBeenCalledOnce();
    expect(itemCount()).toBe(0);
  });

  it('shows the connection dropping and coming back, resuming from the last seq', () => {
    respondWithMenu(100, [item('oolong')]);
    FakeEventSource.latest.open();
    FakeEventSource.latest.message(
      envelope(105, { type: ServerEventType.ItemDeleted, id: 'none' })
    );

    FakeEventSource.latest.fail(FakeEventSource.CLOSED);
    expect(connection()).toBe(ConnectionStatus.Reconnecting);
    expect(itemCount()).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(FakeEventSource.latest.url).toContain('since=105');
    FakeEventSource.latest.open();
    expect(connection()).toBe(ConnectionStatus.Live);
  });

  it('goes offline and back through the browser events', () => {
    respondWithMenu(100, [item('oolong')]);
    const first = FakeEventSource.latest;
    first.open();

    window.dispatchEvent(new Event('offline'));
    expect(connection()).toBe(ConnectionStatus.Offline);

    window.dispatchEvent(new Event('online'));
    expect(connection()).toBe(ConnectionStatus.Reconnecting);
    expect(FakeEventSource.latest).not.toBe(first);

    FakeEventSource.latest.open();
    expect(connection()).toBe(ConnectionStatus.Live);
  });

  it('recovers from a failed request while the stream looked fine', () => {
    respondWithMenu(100, [item('oolong')]);
    const first = FakeEventSource.latest;
    first.open();

    store.dispatch(connectionActions.requestNoResponse());
    expect(connection()).toBe(ConnectionStatus.Reconnecting);
    expect(first.readyState).toBe(FakeEventSource.CLOSED);

    FakeEventSource.latest.open();
    expect(connection()).toBe(ConnectionStatus.Live);
  });

  it('retries a failed first load when the browser comes back', () => {
    const noResponse = () =>
      http.expectOne('/api/menu').error(new ProgressEvent('error'), { status: 0 });
    noResponse();
    vi.advanceTimersByTime(1000);
    noResponse();
    vi.advanceTimersByTime(2000);
    noResponse();
    vi.advanceTimersByTime(4000);
    noResponse();
    expect(loadStatus()).toBe(LoadStatus.Failed);
    expect(FakeEventSource.instances).toEqual([]);

    window.dispatchEvent(new Event('online'));
    respondWithMenu(100, [item('oolong')]);

    expect(loadStatus()).toBe(LoadStatus.Loaded);
    expect(itemCount()).toBe(1);
  });
});
