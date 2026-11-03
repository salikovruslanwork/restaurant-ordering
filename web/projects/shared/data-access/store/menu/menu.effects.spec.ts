import { TestBed } from '@angular/core/testing';

import { of, ReplaySubject, throwError } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ServerEventType } from '@restaurant/contracts';

import { SERVER_ERROR_MESSAGE } from '../../config/api.config';
import { RequestError } from '../../helpers/request-error';
import { LoadStatus } from '../../models/menu.model';
import { MenuApiService } from '../../services/menu-api.service';
import { connectionActions } from '../connection/connection.actions';
import { realtimeActions } from '../realtime/realtime.actions';
import { menuActions } from './menu.actions';
import { MenuEffects } from './menu.effects';
import { menuFeature } from './menu.reducer';

const snapshot = { categories: [], items: [], seq: 1 };

describe('MenuEffects', () => {
  let actions$: ReplaySubject<Action>;
  let getMenu: ReturnType<typeof vi.fn>;

  function create(loadStatus = LoadStatus.Idle): MenuEffects {
    TestBed.configureTestingModule({
      providers: [
        MenuEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [{ selector: menuFeature.selectLoadStatus, value: loadStatus }]
        }),
        { provide: MenuApiService, useValue: { getMenu } }
      ]
    });
    return TestBed.inject(MenuEffects);
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    getMenu = vi.fn(() => of(snapshot));
  });

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  it('asks for the menu when the effects start', () => {
    expect(create().ngrxOnInitEffects()).toEqual(menuActions.load());
  });

  it('loads the menu', () => {
    const received: Action[] = [];
    const effects = create();
    actions$.next(menuActions.load());

    effects.load$.subscribe((action) => received.push(action));

    expect(received).toEqual([menuActions.loadSucceeded({ snapshot })]);
  });

  it('reports a failed load with a safe message, and keeps working', () => {
    const received: Action[] = [];
    getMenu = vi.fn(() => throwError(() => new RequestError(0, null, 'No connection')));
    const effects = create();
    effects.load$.subscribe((action) => received.push(action));

    actions$.next(menuActions.load());
    getMenu.mockReturnValue(throwError(() => new Error('secret')));
    actions$.next(menuActions.load());
    getMenu.mockReturnValue(of(snapshot));
    actions$.next(menuActions.load());

    expect(received).toEqual([
      menuActions.loadFailed({ message: 'No connection' }),
      menuActions.loadFailed({ message: SERVER_ERROR_MESSAGE }),
      menuActions.loadSucceeded({ snapshot })
    ]);
  });

  it('reloads on resync only', () => {
    const received: Action[] = [];
    const effects = create();
    effects.reloadOnResync$.subscribe((action) => received.push(action));
    const at = '2026-11-01T00:00:00.000Z';

    actions$.next(
      realtimeActions.eventReceived({
        envelope: { seq: 2, at, event: { type: ServerEventType.ItemDeleted, id: 'a' } }
      })
    );
    expect(received).toEqual([]);

    actions$.next(
      realtimeActions.eventReceived({
        envelope: { seq: 3, at, event: { type: ServerEventType.Resync } }
      })
    );
    expect(received).toEqual([menuActions.load()]);
  });

  it.each([
    [LoadStatus.Failed, [menuActions.load()]],
    [LoadStatus.Loaded, []],
    [LoadStatus.Loading, []]
  ])('when back online with status %s', (status, expected) => {
    const received: Action[] = [];
    const effects = create(status);
    effects.retryWhenOnline$.subscribe((action) => received.push(action));

    actions$.next(connectionActions.browserOnline());

    expect(received).toEqual(expected);
  });
});
