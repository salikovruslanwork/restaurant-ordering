import { TestBed } from '@angular/core/testing';

import type { Action } from '@ngrx/store';

import { connectionActions } from './connection.actions';
import { ConnectionEffects } from './connection.effects';

describe('ConnectionEffects', () => {
  let received: Action[];
  let stop: () => void;

  function start(): void {
    TestBed.configureTestingModule({ providers: [ConnectionEffects] });
    const subscription = TestBed.inject(ConnectionEffects).browserStatus$.subscribe((action) =>
      received.push(action)
    );
    stop = () => subscription.unsubscribe();
  }

  beforeEach(() => {
    received = [];
  });

  afterEach(() => {
    stop();
    vi.restoreAllMocks();
  });

  it('reports nothing at start when the browser is online', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);

    start();

    expect(received).toEqual([]);
  });

  it('reports offline at start', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    start();

    expect(received).toEqual([connectionActions.browserOffline()]);
  });

  it('follows the browser events', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    start();

    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));

    expect(received).toEqual([
      connectionActions.browserOffline(),
      connectionActions.browserOnline()
    ]);
  });
});
