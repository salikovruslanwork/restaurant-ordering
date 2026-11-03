import { PricingKind, ServerEventType, type Category, type MenuItem } from '@restaurant/contracts';
import { menuActions, realtimeActions } from '@shared/data-access';
import {
  AvailabilityFilter,
  ItemFormField,
  MoveDirection,
  type MenuEditorState
} from '@admin/models/menu-editor.model';

import { menuEditorActions } from './menu-editor.actions';
import { menuEditorFeature } from './menu-editor.reducer';

const { reducer } = menuEditorFeature;
const category: Category = { id: 'tea', name: 'Tea', sortOrder: 0, version: 2 };

function editing(id: string | null = 'tea', isSaving = false): MenuEditorState {
  return reducer(
    reducer(undefined, menuEditorActions.startCategoryEdit({ id })),
    isSaving ? menuEditorActions.saveCategory({ id: null, name: 'Tea' }) : { type: 'noop' }
  );
}

describe('menuEditor reducer', () => {
  it('starts with nothing open or busy', () => {
    const state = reducer(undefined, { type: 'init' });

    expect(state).toEqual({
      categoryEdit: null,
      busyCategoryIds: [],
      itemFilter: { categoryId: null, availability: AvailabilityFilter.All },
      itemEdit: null,
      pendingAvailability: {},
      deletingItemIds: [],
      freshIds: []
    });
  });

  describe('category editor', () => {
    it('opens for an existing or a new category', () => {
      expect(editing('tea').categoryEdit).toEqual({ id: 'tea', isSaving: false, error: null });
      expect(editing(null).categoryEdit).toEqual({ id: null, isSaving: false, error: null });
    });

    it('switches to another category while not saving', () => {
      const state = reducer(editing('tea'), menuEditorActions.startCategoryEdit({ id: 'soup' }));

      expect(state.categoryEdit?.id).toBe('soup');
    });

    it('stays on the saving category until the save ends', () => {
      const saving = editing('tea', true);

      expect(reducer(saving, menuEditorActions.startCategoryEdit({ id: 'soup' }))).toBe(saving);
      expect(reducer(saving, menuEditorActions.cancelCategoryEdit())).toBe(saving);
    });

    it('closes on cancel', () => {
      expect(reducer(editing(), menuEditorActions.cancelCategoryEdit()).categoryEdit).toBeNull();
    });

    it('closes when its category is deleted here or elsewhere', () => {
      const removed = reducer(editing('tea'), menuActions.categoryRemoved({ id: 'tea' }));
      const otherRemoved = reducer(editing('tea'), menuActions.categoryRemoved({ id: 'soup' }));
      const deletedElsewhere = reducer(
        editing('tea', true),
        realtimeActions.eventReceived({
          envelope: {
            seq: 5,
            at: '2026-11-01T00:00:00.000Z',
            event: { type: ServerEventType.CategoryDeleted, id: 'tea' }
          }
        })
      );

      expect(removed.categoryEdit).toBeNull();
      expect(otherRemoved.categoryEdit?.id).toBe('tea');
      expect(deletedElsewhere.categoryEdit).toBeNull();
    });

    it('marks saving and clears an earlier error', () => {
      const failed = reducer(
        editing('tea', true),
        menuEditorActions.categorySaveFailed({ error: 'Taken' })
      );

      const state = reducer(failed, menuEditorActions.saveCategory({ id: null, name: 'Teas' }));

      expect(state.categoryEdit).toEqual({ id: 'tea', isSaving: true, error: null });
    });

    it('ignores a save with no editor open', () => {
      const state = reducer(undefined, { type: 'init' });

      expect(reducer(state, menuEditorActions.saveCategory({ id: null, name: 'Tea' }))).toBe(state);
      expect(reducer(state, menuEditorActions.categorySaveFailed({ error: 'x' }))).toBe(state);
    });

    it('closes after a successful save', () => {
      const state = reducer(
        editing('tea', true),
        menuEditorActions.categorySaved({ category, isNew: false })
      );

      expect(state.categoryEdit).toBeNull();
    });

    it('keeps the editor open with the error after a failed save', () => {
      const state = reducer(
        editing('tea', true),
        menuEditorActions.categorySaveFailed({ error: 'A category with this name already exists' })
      );

      expect(state.categoryEdit).toEqual({
        id: 'tea',
        isSaving: false,
        error: 'A category with this name already exists'
      });
    });
  });

  describe('busy categories', () => {
    it('tracks moves and deletes until they end', () => {
      let state = reducer(
        undefined,
        menuEditorActions.moveCategory({ id: 'tea', direction: MoveDirection.Up })
      );
      state = reducer(state, menuEditorActions.deleteCategory({ id: 'soup', name: 'Soup' }));
      expect(state.busyCategoryIds).toEqual(['tea', 'soup']);
      expect(menuEditorFeature.selectHasBusyCategory({ menuEditor: state })).toBe(true);

      state = reducer(
        state,
        menuEditorActions.categoryMoved({ id: 'tea', name: 'Tea', position: 1 })
      );
      state = reducer(
        state,
        menuEditorActions.categoryDeleteFailed({ id: 'soup', error: 'x', isNotEmpty: true })
      );
      expect(state.busyCategoryIds).toEqual([]);
      expect(menuEditorFeature.selectHasBusyCategory({ menuEditor: state })).toBe(false);
    });

    it('lists a category once even if it is moved twice', () => {
      const move = menuEditorActions.moveCategory({ id: 'tea', direction: MoveDirection.Down });

      const state = reducer(reducer(undefined, move), move);

      expect(state.busyCategoryIds).toEqual(['tea']);
    });

    it('frees a category after a failed move or a delete', () => {
      const busy = reducer(
        reducer(
          undefined,
          menuEditorActions.moveCategory({ id: 'tea', direction: MoveDirection.Up })
        ),
        menuEditorActions.deleteCategory({ id: 'soup', name: 'Soup' })
      );

      let state = reducer(busy, menuEditorActions.categoryMoveFailed({ id: 'tea', error: 'x' }));
      state = reducer(state, menuEditorActions.categoryDeleted({ id: 'soup', name: 'Soup' }));

      expect(state.busyCategoryIds).toEqual([]);
    });
  });

  describe('item filter', () => {
    it('filters by category and availability, and clears both', () => {
      let state = reducer(
        undefined,
        menuEditorActions.filterItemsByCategory({ categoryId: 'tea' })
      );
      state = reducer(
        state,
        menuEditorActions.filterItemsByAvailability({ availability: AvailabilityFilter.Available })
      );
      expect(state.itemFilter).toEqual({
        categoryId: 'tea',
        availability: AvailabilityFilter.Available
      });

      state = reducer(state, menuEditorActions.clearItemFilters());
      expect(state.itemFilter).toEqual({ categoryId: null, availability: AvailabilityFilter.All });
    });
  });

  describe('item editor', () => {
    const item: MenuItem = {
      id: 'miso',
      categoryId: 'soup',
      name: 'Miso',
      description: '',
      pricing: { kind: PricingKind.Open },
      isAvailable: true,
      version: 2,
      updatedAt: '2026-11-01T00:00:00.000Z'
    };
    const request = {
      categoryId: 'soup',
      name: 'Miso',
      description: '',
      pricing: { kind: PricingKind.Open as const },
      isAvailable: true
    };
    const open = (id: string | null = 'miso') =>
      reducer(undefined, menuEditorActions.startItemEdit({ id }));

    it('opens, saves and closes', () => {
      const opened = open();
      expect(opened.itemEdit).toEqual({
        id: 'miso',
        isSaving: false,
        formError: null,
        fieldErrors: {}
      });

      const saving = reducer(opened, menuEditorActions.saveItem({ id: null, request }));
      expect(saving.itemEdit?.isSaving).toBe(true);
      expect(reducer(saving, menuEditorActions.cancelItemEdit())).toBe(saving);
      expect(reducer(saving, menuEditorActions.startItemEdit({ id: null }))).toBe(saving);

      const saved = reducer(saving, menuEditorActions.itemSaved({ item, isNew: false }));
      expect(saved.itemEdit).toBeNull();
    });

    it('keeps the editor open with the errors after a failed save, and clears them on retry', () => {
      const error = { formError: 'Offline', fieldErrors: { [ItemFormField.Name]: 'Taken' } };
      const failed = reducer(
        reducer(open(), menuEditorActions.saveItem({ id: null, request })),
        menuEditorActions.itemSaveFailed({ error })
      );
      expect(failed.itemEdit).toEqual({ id: 'miso', isSaving: false, ...error });

      const retry = reducer(failed, menuEditorActions.saveItem({ id: null, request }));
      expect(retry.itemEdit).toEqual({
        id: 'miso',
        isSaving: true,
        formError: null,
        fieldErrors: {}
      });
    });

    it('ignores saves and failures with no editor open', () => {
      const state = reducer(undefined, { type: 'init' });

      expect(reducer(state, menuEditorActions.saveItem({ id: null, request }))).toBe(state);
      expect(
        reducer(
          state,
          menuEditorActions.itemSaveFailed({ error: { formError: 'x', fieldErrors: {} } })
        )
      ).toBe(state);
    });

    it('closes on cancel', () => {
      expect(reducer(open(null), menuEditorActions.cancelItemEdit()).itemEdit).toBeNull();
    });

    it('tracks pending availability until the answer', () => {
      let state = reducer(
        undefined,
        menuEditorActions.changeItemAvailability({ id: 'miso', isAvailable: false })
      );
      state = reducer(
        state,
        menuEditorActions.changeItemAvailability({ id: 'tea', isAvailable: true })
      );
      expect(state.pendingAvailability).toEqual({ miso: false, tea: true });

      state = reducer(state, menuEditorActions.itemAvailabilityChanged({ item }));
      state = reducer(
        state,
        menuEditorActions.itemAvailabilityFailed({ id: 'tea', name: 'Tea', error: 'x' })
      );
      expect(state.pendingAvailability).toEqual({});
    });

    it('tracks deletes until they end', () => {
      let state = reducer(undefined, menuEditorActions.deleteItem({ id: 'miso', name: 'Miso' }));
      state = reducer(state, menuEditorActions.deleteItem({ id: 'miso', name: 'Miso' }));
      state = reducer(state, menuEditorActions.deleteItem({ id: 'tea', name: 'Tea' }));
      expect(state.deletingItemIds).toEqual(['miso', 'tea']);

      state = reducer(state, menuEditorActions.itemDeleted({ id: 'miso', name: 'Miso' }));
      state = reducer(state, menuEditorActions.itemDeleteFailed({ id: 'tea', error: 'x' }));
      expect(state.deletingItemIds).toEqual([]);
    });
  });

  describe('fresh rows', () => {
    const miso: MenuItem = {
      id: 'miso',
      categoryId: 'soup',
      name: 'Miso',
      description: '',
      pricing: { kind: PricingKind.Fixed, price: 450 },
      isAvailable: true,
      version: 2,
      updatedAt: '2026-11-01T00:00:00.000Z'
    };
    const event = (
      serverEvent: Parameters<typeof realtimeActions.eventReceived>[0]['envelope']['event']
    ) =>
      realtimeActions.eventReceived({
        envelope: { seq: 3, at: '2026-11-01T00:00:00.000Z', event: serverEvent }
      });

    it('marks rows saved here or changed live, once each', () => {
      const actions = [
        menuEditorActions.itemSaved({ item: miso, isNew: false }),
        menuEditorActions.itemAvailabilityChanged({ item: miso }),
        menuEditorActions.categorySaved({ category, isNew: true }),
        event({ type: ServerEventType.ItemUpserted, item: { ...miso, id: 'udon' } }),
        event({ type: ServerEventType.CategoryUpserted, category: { ...category, id: 'soup' } }),
        event({ type: ServerEventType.ItemDeleted, id: 'ramen' })
      ];
      const state = actions.reduce(reducer, reducer(undefined, { type: 'init' }));

      expect(state.freshIds).toEqual(['miso', 'tea', 'udon', 'soup']);
      expect(menuEditorFeature.selectFreshIdSet.projector(state.freshIds).has('udon')).toBe(true);
    });

    it('stops marking rows whose pulse ended', () => {
      let state = reducer(undefined, menuEditorActions.itemSaved({ item: miso, isNew: false }));
      state = reducer(state, menuEditorActions.categorySaved({ category, isNew: false }));

      state = reducer(state, menuEditorActions.freshEnded({ ids: ['miso'] }));

      expect(state.freshIds).toEqual(['tea']);
    });
  });
});
