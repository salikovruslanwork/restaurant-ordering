import { createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import {
  ServerEventType,
  type Category,
  type Id,
  type MenuItem,
  type ServerEvent
} from '@restaurant/contracts';

import { upsertNewer } from '../../helpers/reducer-state';
import { LoadStatus, type MenuState } from '../../models/menu.model';
import { realtimeActions } from '../realtime/realtime.actions';
import { menuActions } from './menu.actions';

const categoriesAdapter = createEntityAdapter<Category>({
  sortComparer: (a, b) => a.sortOrder - b.sortOrder
});
const itemsAdapter = createEntityAdapter<MenuItem>();

const initialState: MenuState = {
  categories: categoriesAdapter.getInitialState(),
  items: itemsAdapter.getInitialState(),
  loadStatus: LoadStatus.Idle,
  error: null,
  seq: null
};

function applyEvent(state: MenuState, event: ServerEvent): MenuState {
  switch (event.type) {
    case ServerEventType.CategoryUpserted:
      return {
        ...state,
        categories: categoriesAdapter.upsertOne(event.category, state.categories)
      };
    case ServerEventType.CategoryDeleted:
      return { ...state, categories: categoriesAdapter.removeOne(event.id, state.categories) };
    case ServerEventType.ItemUpserted:
      return { ...state, items: itemsAdapter.upsertOne(event.item, state.items) };
    case ServerEventType.ItemDeleted:
      return { ...state, items: itemsAdapter.removeOne(event.id, state.items) };
    default:
      return state;
  }
}

function groupByCategory(items: MenuItem[]): Map<Id, MenuItem[]> {
  const groups = new Map<Id, MenuItem[]>();
  for (const item of items) {
    const group = groups.get(item.categoryId);
    if (group) {
      group.push(item);
    } else {
      groups.set(item.categoryId, [item]);
    }
  }
  return groups;
}

export const menuFeature = createFeature({
  name: 'menu',
  reducer: createReducer(
    initialState,
    on(menuActions.load, (state): MenuState => ({ ...state, loadStatus: LoadStatus.Loading })),
    on(menuActions.loadSucceeded, (state, { snapshot }): MenuState => ({
      categories: categoriesAdapter.setAll(snapshot.categories, state.categories),
      items: itemsAdapter.setAll(snapshot.items, state.items),
      loadStatus: LoadStatus.Loaded,
      error: null,
      seq: snapshot.seq
    })),
    on(menuActions.loadFailed, (state, { message }): MenuState => ({
      ...state,
      loadStatus: LoadStatus.Failed,
      error: message
    })),
    // The saving tab applies its own response at once; a version check keeps a newer event's data.
    on(menuActions.categorySaved, (state, { category }): MenuState => ({
      ...state,
      categories: upsertNewer(categoriesAdapter, state.categories, category)
    })),
    on(menuActions.categoryRemoved, (state, { id }): MenuState => ({
      ...state,
      categories: categoriesAdapter.removeOne(id, state.categories)
    })),
    on(menuActions.itemSaved, (state, { item }): MenuState => ({
      ...state,
      items: upsertNewer(itemsAdapter, state.items, item)
    })),
    on(menuActions.itemRemoved, (state, { id }): MenuState => ({
      ...state,
      items: itemsAdapter.removeOne(id, state.items)
    })),
    // Replays can repeat what a snapshot already contains, so older events are ignored.
    on(realtimeActions.eventReceived, (state, { envelope }): MenuState => {
      if (state.seq === null || envelope.seq <= state.seq) {
        return state;
      }
      return { ...applyEvent(state, envelope.event), seq: envelope.seq };
    })
  ),
  extraSelectors: ({ selectCategories, selectItems }) => {
    const categorySelectors = categoriesAdapter.getSelectors();
    const itemSelectors = itemsAdapter.getSelectors();
    const selectAllCategories = createSelector(selectCategories, categorySelectors.selectAll);
    const selectAllItems = createSelector(selectItems, itemSelectors.selectAll);
    const selectItemsByCategory = createSelector(selectAllItems, groupByCategory);

    return {
      selectAllCategories,
      selectAllItems,
      selectItemEntities: createSelector(selectItems, itemSelectors.selectEntities),
      selectItemCount: createSelector(selectItems, itemSelectors.selectTotal),
      selectItemsByCategory,
      selectCategoriesWithItems: createSelector(
        selectAllCategories,
        selectItemsByCategory,
        (categories, groups) => categories.filter(({ id }) => groups.has(id))
      )
    };
  }
});

export const selectItemsInCategory = (categoryId: Id) =>
  createSelector(
    menuFeature.selectItemsByCategory,
    (groups): MenuItem[] => groups.get(categoryId) ?? []
  );
