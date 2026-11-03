import { TestBed } from '@angular/core/testing';

import { of, ReplaySubject, Subject, throwError, type Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ApiErrorCode, PricingKind, type MenuItem } from '@restaurant/contracts';
import { menuActions, MenuApiService, menuFeature, RequestError } from '@shared/data-access';
import { ITEM_SAVE_CONNECTION_ERROR } from '@admin/config/items.config';
import { ItemFormField } from '@admin/models/menu-editor.model';

import { MenuEditorItemsEffects } from './menu-editor-items.effects';
import { menuEditorActions } from './menu-editor.actions';

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
const request = {
  categoryId: 'soup',
  name: 'Miso',
  description: '',
  pricing: { kind: PricingKind.Fixed as const, price: 450 },
  isAvailable: true
};

describe('MenuEditorItemsEffects', () => {
  let actions$: ReplaySubject<Action>;
  let createItem: ReturnType<typeof vi.fn>;
  let updateItem: ReturnType<typeof vi.fn>;
  let deleteItem: ReturnType<typeof vi.fn>;

  function create(): MenuEditorItemsEffects {
    TestBed.configureTestingModule({
      providers: [
        MenuEditorItemsEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [{ selector: menuFeature.selectItemEntities, value: { miso } }]
        }),
        { provide: MenuApiService, useValue: { createItem, updateItem, deleteItem } }
      ]
    });
    return TestBed.inject(MenuEditorItemsEffects);
  }

  function collect(effect$: Observable<Action>): Action[] {
    const received: Action[] = [];
    effect$.subscribe((action) => received.push(action));
    return received;
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    createItem = vi.fn(() => of({ ...miso, id: 'new' }));
    updateItem = vi.fn((_id: string, request: Partial<MenuItem>) =>
      of({ ...miso, ...request, version: 2 })
    );
    deleteItem = vi.fn(() => of(undefined));
  });

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  it('creates or updates an item and applies it to the menu', () => {
    const received = collect(create().saveItem$);

    actions$.next(menuEditorActions.saveItem({ id: null, request }));

    expect(createItem).toHaveBeenCalledWith(request);
    expect(received).toEqual([
      menuActions.itemSaved({ item: { ...miso, id: 'new' } }),
      menuEditorActions.itemSaved({ item: { ...miso, id: 'new' }, isNew: true })
    ]);
  });

  it('updates an existing item', () => {
    const received = collect(create().saveItem$);

    actions$.next(menuEditorActions.saveItem({ id: 'miso', request }));

    expect(updateItem).toHaveBeenCalledWith('miso', request);
    expect(received.at(-1)).toEqual(
      menuEditorActions.itemSaved({ item: { ...miso, ...request, version: 2 }, isNew: false })
    );
  });

  it('maps a failed save to form and field errors', () => {
    updateItem = vi.fn(() =>
      throwError(
        () =>
          new RequestError(
            400,
            {
              code: ApiErrorCode.Validation,
              message: 'Check',
              fields: { 'pricing.price': ['Too high'] }
            },
            'Check'
          )
      )
    );
    const received = collect(create().saveItem$);
    actions$.next(menuEditorActions.saveItem({ id: 'miso', request }));

    updateItem.mockReturnValue(throwError(() => new RequestError(0, null, 'Offline')));
    actions$.next(menuEditorActions.saveItem({ id: 'miso', request }));

    expect(received).toEqual([
      menuEditorActions.itemSaveFailed({
        error: { formError: null, fieldErrors: { [ItemFormField.Price]: 'Too high' } }
      }),
      menuEditorActions.itemSaveFailed({
        error: { formError: ITEM_SAVE_CONNECTION_ERROR, fieldErrors: {} }
      })
    ]);
  });

  it('ignores a second save while one runs', () => {
    const response$ = new Subject<MenuItem>();
    updateItem = vi.fn(() => response$);
    const received = collect(create().saveItem$);

    actions$.next(menuEditorActions.saveItem({ id: 'miso', request }));
    actions$.next(menuEditorActions.saveItem({ id: 'miso', request }));
    response$.next(miso);
    response$.complete();

    expect(updateItem).toHaveBeenCalledOnce();
    expect(received).toHaveLength(2);
  });

  it('changes availability, and reports a failure with the item name', () => {
    const received = collect(create().changeItemAvailability$);
    actions$.next(menuEditorActions.changeItemAvailability({ id: 'miso', isAvailable: false }));

    updateItem.mockReturnValue(throwError(() => new RequestError(0, null, 'Offline')));
    actions$.next(menuEditorActions.changeItemAvailability({ id: 'miso', isAvailable: true }));

    const saved = { ...miso, isAvailable: false, version: 2 };
    expect(updateItem).toHaveBeenNthCalledWith(1, 'miso', { isAvailable: false });
    expect(received).toEqual([
      menuActions.itemSaved({ item: saved }),
      menuEditorActions.itemAvailabilityChanged({ item: saved }),
      menuEditorActions.itemAvailabilityFailed({ id: 'miso', name: 'Miso', error: 'Offline' })
    ]);
  });

  it('deletes an item', () => {
    const received = collect(create().deleteItem$);
    actions$.next(menuEditorActions.deleteItem({ id: 'miso', name: 'Miso' }));

    deleteItem.mockReturnValue(throwError(() => new RequestError(0, null, 'Offline')));
    actions$.next(menuEditorActions.deleteItem({ id: 'miso', name: 'Miso' }));

    expect(received).toEqual([
      menuActions.itemRemoved({ id: 'miso' }),
      menuEditorActions.itemDeleted({ id: 'miso', name: 'Miso' }),
      menuEditorActions.itemDeleteFailed({ id: 'miso', error: 'Offline' })
    ]);
  });
});
