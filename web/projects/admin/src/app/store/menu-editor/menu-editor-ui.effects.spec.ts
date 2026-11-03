import { TestBed } from '@angular/core/testing';
import { LiveAnnouncer } from '@angular/cdk/a11y';

import { of, ReplaySubject, type Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { PricingKind, type Category, type MenuItem } from '@restaurant/contracts';
import { DialogService, NotificationKind, NotificationService } from '@shared/ui';
import { MENU_FRESH_MS } from '@admin/config/items.config';

import { MenuEditorUiEffects } from './menu-editor-ui.effects';
import { menuEditorActions } from './menu-editor.actions';
import { menuEditorFeature } from './menu-editor.reducer';

const soup: Category = { id: 'soup', name: 'Soup', sortOrder: 0, version: 1 };
const tea: Category = { id: 'tea', name: 'Tea', sortOrder: 4, version: 1 };
const miso: MenuItem = {
  id: 'miso',
  categoryId: 'soup',
  name: 'Miso',
  description: '',
  pricing: { kind: PricingKind.Fixed, price: 450 },
  isAvailable: true,
  version: 1,
  updatedAt: '2026-11-01T00:00:00.000Z'
};
describe('MenuEditorUiEffects', () => {
  let actions$: ReplaySubject<Action>;
  let show: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let announce: ReturnType<typeof vi.fn>;

  function create(): MenuEditorUiEffects {
    TestBed.configureTestingModule({
      providers: [
        MenuEditorUiEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [{ selector: menuEditorFeature.selectFreshIds, value: ['miso'] }]
        }),
        { provide: NotificationService, useValue: { show } },
        { provide: DialogService, useValue: { confirm } },
        { provide: LiveAnnouncer, useValue: { announce } }
      ]
    });
    return TestBed.inject(MenuEditorUiEffects);
  }

  function collect(effect$: Observable<Action>): Action[] {
    const received: Action[] = [];
    effect$.subscribe((action) => received.push(action));
    return received;
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    show = vi.fn(() => of());
    confirm = vi.fn();
    announce = vi.fn(() => Promise.resolve());
  });

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
    vi.useRealTimers();
  });

  it('shows a snackbar for a new category and announces a rename', () => {
    create().announceCategorySaved$.subscribe();

    actions$.next(menuEditorActions.categorySaved({ category: tea, isNew: true }));
    actions$.next(menuEditorActions.categorySaved({ category: soup, isNew: false }));

    expect(show).toHaveBeenCalledExactlyOnceWith('Category “Tea” added', {
      kind: NotificationKind.Info
    });
    expect(announce).toHaveBeenCalledExactlyOnceWith('Renamed to Soup');
  });

  it('announces the new position after a move', () => {
    create().announceCategoryMoved$.subscribe();

    actions$.next(menuEditorActions.categoryMoved({ id: 'tea', name: 'Tea', position: 1 }));

    expect(announce).toHaveBeenCalledWith('Tea moved to position 1');
  });

  it('confirms a delete with a snackbar', () => {
    create().announceCategoryDeleted$.subscribe();

    actions$.next(menuEditorActions.categoryDeleted({ id: 'soup', name: 'Soup' }));

    expect(show).toHaveBeenCalledWith('Category “Soup” deleted', {
      kind: NotificationKind.Info
    });
  });

  it('opens the blocked dialog for a category that isn’t empty, and a snackbar otherwise', () => {
    const effects = create();
    effects.reportCategoryDeleteFailed$.subscribe();
    effects.reportCategoryMoveFailed$.subscribe();

    actions$.next(
      menuEditorActions.categoryDeleteFailed({ id: 'soup', error: 'Has items', isNotEmpty: true })
    );
    actions$.next(
      menuEditorActions.categoryDeleteFailed({ id: 'soup', error: 'Offline', isNotEmpty: false })
    );
    actions$.next(menuEditorActions.categoryMoveFailed({ id: 'tea', error: 'Server error' }));

    expect(confirm).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ text: 'Has items', confirmLabel: 'OK' })
    );
    expect(show.mock.calls).toEqual([
      ['Offline', { kind: NotificationKind.Error }],
      ['Server error', { kind: NotificationKind.Error }]
    ]);
  });

  it('gives feedback for saves, availability, deletes and failures', () => {
    const effects = create();
    effects.announceItemSaved$.subscribe();
    effects.announceItemAvailability$.subscribe();
    effects.announceItemDeleted$.subscribe();
    effects.reportItemAvailabilityFailed$.subscribe();
    effects.reportItemDeleteFailed$.subscribe();

    actions$.next(menuEditorActions.itemSaved({ item: miso, isNew: true }));
    actions$.next(menuEditorActions.itemSaved({ item: miso, isNew: false }));
    actions$.next(
      menuEditorActions.itemAvailabilityChanged({ item: { ...miso, isAvailable: false } })
    );
    actions$.next(menuEditorActions.itemDeleted({ id: 'miso', name: 'Miso' }));
    actions$.next(
      menuEditorActions.itemAvailabilityFailed({ id: 'miso', name: 'Miso', error: 'Offline' })
    );
    actions$.next(menuEditorActions.itemDeleteFailed({ id: 'miso', error: 'Server error' }));

    expect(show.mock.calls).toEqual([
      ['Miso added', { kind: NotificationKind.Info }],
      ['Miso saved', { kind: NotificationKind.Info }],
      ['Miso deleted', { kind: NotificationKind.Info }],
      ['Couldn’t update Miso. Offline', { kind: NotificationKind.Error }],
      ['Server error', { kind: NotificationKind.Error }]
    ]);
    expect(announce).toHaveBeenCalledWith('Miso is now unavailable');
  });

  it('ends the row highlight after the pulse', () => {
    vi.useFakeTimers();
    const received = collect(create().endFresh$);

    actions$.next(menuEditorActions.itemSaved({ item: miso, isNew: false }));
    vi.advanceTimersByTime(MENU_FRESH_MS - 1);
    expect(received).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(received).toEqual([menuEditorActions.freshEnded({ ids: ['miso'] })]);
  });
});
