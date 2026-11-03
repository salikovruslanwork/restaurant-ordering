import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import { ServerEventType, type Id, type ServerEvent } from '@restaurant/contracts';
import { menuActions, omitKey, realtimeActions } from '@shared/data-access';
import { AvailabilityFilter, type MenuEditorState } from '@admin/models/menu-editor.model';

import { menuEditorActions } from './menu-editor.actions';

const initialState: MenuEditorState = {
  categoryEdit: null,
  busyCategoryIds: [],
  itemFilter: { categoryId: null, availability: AvailabilityFilter.All },
  itemEdit: null,
  pendingAvailability: {},
  deletingItemIds: [],
  freshIds: []
};

function withoutId(ids: Id[], id: Id): Id[] {
  return ids.filter((busyId) => busyId !== id);
}

// The open row would vanish with its category, leaving a save that can only fail.
function closeEditorOf(state: MenuEditorState, id: Id): MenuEditorState {
  return state.categoryEdit?.id === id ? { ...state, categoryEdit: null } : state;
}

function withFresh(state: MenuEditorState, id: Id): MenuEditorState {
  return { ...state, freshIds: [...withoutId(state.freshIds, id), id] };
}

// Rows changed live or by our own save pulse once; deletes and moves of others don't.
function freshIdOf(event: ServerEvent): Id | null {
  if (event.type === ServerEventType.ItemUpserted) {
    return event.item.id;
  }
  return event.type === ServerEventType.CategoryUpserted ? event.category.id : null;
}

export const menuEditorFeature = createFeature({
  name: 'menuEditor',
  reducer: createReducer(
    initialState,
    on(menuEditorActions.startCategoryEdit, (state, { id }): MenuEditorState =>
      state.categoryEdit?.isSaving
        ? state
        : { ...state, categoryEdit: { id, isSaving: false, error: null } }
    ),
    on(menuEditorActions.cancelCategoryEdit, (state): MenuEditorState =>
      state.categoryEdit?.isSaving ? state : { ...state, categoryEdit: null }
    ),
    on(menuEditorActions.saveCategory, (state): MenuEditorState =>
      state.categoryEdit
        ? { ...state, categoryEdit: { ...state.categoryEdit, isSaving: true, error: null } }
        : state
    ),
    on(menuEditorActions.categorySaved, (state, { category }): MenuEditorState => ({
      ...withFresh(state, category.id),
      categoryEdit: null
    })),
    on(menuEditorActions.categorySaveFailed, (state, { error }): MenuEditorState =>
      state.categoryEdit
        ? { ...state, categoryEdit: { ...state.categoryEdit, isSaving: false, error } }
        : state
    ),
    on(
      menuEditorActions.moveCategory,
      menuEditorActions.deleteCategory,
      (state, { id }): MenuEditorState => ({
        ...state,
        busyCategoryIds: [...withoutId(state.busyCategoryIds, id), id]
      })
    ),
    on(
      menuEditorActions.categoryMoved,
      menuEditorActions.categoryMoveFailed,
      menuEditorActions.categoryDeleted,
      menuEditorActions.categoryDeleteFailed,
      (state, { id }): MenuEditorState => ({
        ...state,
        busyCategoryIds: withoutId(state.busyCategoryIds, id)
      })
    ),
    on(menuActions.categoryRemoved, (state, { id }): MenuEditorState => closeEditorOf(state, id)),
    on(realtimeActions.eventReceived, (state, { envelope: { event } }): MenuEditorState => {
      if (event.type === ServerEventType.CategoryDeleted) {
        return closeEditorOf(state, event.id);
      }
      const id = freshIdOf(event);
      return id ? withFresh(state, id) : state;
    }),
    on(menuEditorActions.filterItemsByCategory, (state, { categoryId }): MenuEditorState => ({
      ...state,
      itemFilter: { ...state.itemFilter, categoryId }
    })),
    on(menuEditorActions.filterItemsByAvailability, (state, { availability }): MenuEditorState => ({
      ...state,
      itemFilter: { ...state.itemFilter, availability }
    })),
    on(menuEditorActions.clearItemFilters, (state): MenuEditorState => ({
      ...state,
      itemFilter: initialState.itemFilter
    })),
    on(menuEditorActions.startItemEdit, (state, { id }): MenuEditorState =>
      state.itemEdit?.isSaving
        ? state
        : { ...state, itemEdit: { id, isSaving: false, formError: null, fieldErrors: {} } }
    ),
    on(menuEditorActions.cancelItemEdit, (state): MenuEditorState =>
      state.itemEdit?.isSaving ? state : { ...state, itemEdit: null }
    ),
    on(menuEditorActions.saveItem, (state): MenuEditorState =>
      state.itemEdit
        ? {
            ...state,
            itemEdit: { ...state.itemEdit, isSaving: true, formError: null, fieldErrors: {} }
          }
        : state
    ),
    on(menuEditorActions.itemSaved, (state, { item }): MenuEditorState => ({
      ...withFresh(state, item.id),
      itemEdit: null
    })),
    on(menuEditorActions.itemSaveFailed, (state, { error }): MenuEditorState =>
      state.itemEdit
        ? { ...state, itemEdit: { ...state.itemEdit, isSaving: false, ...error } }
        : state
    ),
    on(menuEditorActions.changeItemAvailability, (state, { id, isAvailable }): MenuEditorState => ({
      ...state,
      pendingAvailability: { ...state.pendingAvailability, [id]: isAvailable }
    })),
    on(menuEditorActions.itemAvailabilityChanged, (state, { item }): MenuEditorState => ({
      ...withFresh(state, item.id),
      pendingAvailability: omitKey(state.pendingAvailability, item.id)
    })),
    on(menuEditorActions.itemAvailabilityFailed, (state, { id }): MenuEditorState => ({
      ...state,
      pendingAvailability: omitKey(state.pendingAvailability, id)
    })),
    on(menuEditorActions.deleteItem, (state, { id }): MenuEditorState => ({
      ...state,
      deletingItemIds: [...withoutId(state.deletingItemIds, id), id]
    })),
    on(
      menuEditorActions.itemDeleted,
      menuEditorActions.itemDeleteFailed,
      (state, { id }): MenuEditorState => ({
        ...state,
        deletingItemIds: withoutId(state.deletingItemIds, id)
      })
    ),
    on(menuEditorActions.freshEnded, (state, { ids }): MenuEditorState => ({
      ...state,
      freshIds: state.freshIds.filter((id) => !ids.includes(id))
    }))
  ),
  extraSelectors: ({ selectBusyCategoryIds, selectFreshIds }) => ({
    selectHasBusyCategory: createSelector(selectBusyCategoryIds, (ids) => ids.length > 0),
    selectFreshIdSet: createSelector(selectFreshIds, (ids): ReadonlySet<Id> => new Set(ids))
  })
});
