import {
  PricingKind,
  ServerEventType,
  type Category,
  type MenuItem,
  type ServerEvent
} from '@restaurant/contracts';

import { LoadStatus, type MenuState } from '../../models/menu.model';
import { realtimeActions } from '../realtime/realtime.actions';
import { menuActions } from './menu.actions';
import { menuFeature, selectItemsInCategory } from './menu.reducer';

const { reducer } = menuFeature;

function category(id: string, sortOrder: number): Category {
  return { id, name: id, sortOrder, version: 1 };
}

function item(id: string, categoryId: string, version = 1): MenuItem {
  return {
    id,
    categoryId,
    name: id,
    description: '',
    pricing: { kind: PricingKind.Fixed, price: 100 },
    isAvailable: true,
    version,
    updatedAt: '2026-11-01T00:00:00.000Z'
  };
}

const SEQ = 100;

function loaded(): MenuState {
  return reducer(
    undefined,
    menuActions.loadSucceeded({
      snapshot: {
        categories: [category('tea', 1), category('soup', 0), category('empty', 2)],
        items: [item('oolong', 'tea'), item('miso', 'soup'), item('sencha', 'tea')],
        seq: SEQ
      }
    })
  );
}

function receive(state: MenuState, event: ServerEvent, seq = SEQ + 1): MenuState {
  return reducer(
    state,
    realtimeActions.eventReceived({ envelope: { seq, at: '2026-11-01T00:00:00.000Z', event } })
  );
}

function select(state: MenuState) {
  const root = { menu: state };
  return {
    categories: menuFeature.selectAllCategories(root),
    items: menuFeature.selectAllItems(root),
    entities: menuFeature.selectItemEntities(root),
    count: menuFeature.selectItemCount(root),
    visible: menuFeature.selectCategoriesWithItems(root),
    seq: menuFeature.selectSeq(root)
  };
}

function ids(values: { id: string }[]): string[] {
  return values.map(({ id }) => id);
}

describe('menu reducer', () => {
  it('starts empty and idle', () => {
    const state = reducer(undefined, { type: 'init' });

    expect(state.loadStatus).toBe(LoadStatus.Idle);
    expect(state.seq).toBeNull();
    expect(select(state).count).toBe(0);
  });

  it('keeps the existing data while loading', () => {
    const state = reducer(loaded(), menuActions.load());

    expect(state.loadStatus).toBe(LoadStatus.Loading);
    expect(select(state).count).toBe(3);
  });

  it('stores a snapshot and clears an earlier error', () => {
    const failed = reducer(undefined, menuActions.loadFailed({ message: 'Oops' }));

    const state = reducer(
      failed,
      menuActions.loadSucceeded({ snapshot: { categories: [], items: [item('a', 'b')], seq: 5 } })
    );

    expect(state.loadStatus).toBe(LoadStatus.Loaded);
    expect(state.error).toBeNull();
    expect(state.seq).toBe(5);
    expect(select(state).count).toBe(1);
  });

  it('replaces everything on a new snapshot, so removed items disappear', () => {
    const state = reducer(
      loaded(),
      menuActions.loadSucceeded({ snapshot: { categories: [], items: [], seq: 200 } })
    );

    expect(select(state).count).toBe(0);
    expect(select(state).categories).toEqual([]);
  });

  describe('local saves', () => {
    it('applies a saved category at once and re-sorts', () => {
      const state = reducer(
        loaded(),
        menuActions.categorySaved({ category: { ...category('empty', -1), version: 2 } })
      );

      expect(ids(select(state).categories)).toEqual(['empty', 'soup', 'tea']);
    });

    it('adds a new category', () => {
      const state = reducer(
        loaded(),
        menuActions.categorySaved({ category: category('dessert', 3) })
      );

      expect(ids(select(state).categories)).toEqual(['soup', 'tea', 'empty', 'dessert']);
    });

    it('keeps a newer version that an event already brought', () => {
      const newer = receive(loaded(), {
        type: ServerEventType.CategoryUpserted,
        category: { ...category('tea', 1), name: 'Teas', version: 3 }
      });

      const state = reducer(
        newer,
        menuActions.categorySaved({ category: { ...category('tea', 1), name: 'Tea', version: 2 } })
      );

      expect(state.categories).toBe(newer.categories);
    });

    it('applies a saved item, unless an event brought a newer version', () => {
      const saved = reducer(
        loaded(),
        menuActions.itemSaved({ item: { ...item('miso', 'soup', 2), isAvailable: false } })
      );
      expect(select(saved).entities['miso']?.isAvailable).toBe(false);

      const stale = reducer(saved, menuActions.itemSaved({ item: item('miso', 'soup', 1) }));
      expect(stale.items).toBe(saved.items);

      const added = reducer(saved, menuActions.itemSaved({ item: item('ramen', 'soup') }));
      expect(select(added).count).toBe(4);
    });

    it('removes a deleted item', () => {
      const state = reducer(loaded(), menuActions.itemRemoved({ id: 'miso' }));

      expect(ids(select(state).items)).toEqual(['oolong', 'sencha']);
    });

    it('removes a deleted category', () => {
      const state = reducer(loaded(), menuActions.categoryRemoved({ id: 'empty' }));

      expect(ids(select(state).categories)).toEqual(['soup', 'tea']);
    });
  });

  it('keeps the data and stores the message when a load fails', () => {
    const state = reducer(loaded(), menuActions.loadFailed({ message: 'Oops' }));

    expect(state.loadStatus).toBe(LoadStatus.Failed);
    expect(state.error).toBe('Oops');
    expect(select(state).count).toBe(3);
  });

  describe('live events', () => {
    it('adds and updates an item, and advances seq', () => {
      const added = receive(loaded(), {
        type: ServerEventType.ItemUpserted,
        item: item('new', 'tea')
      });
      const updated = receive(
        added,
        { type: ServerEventType.ItemUpserted, item: { ...item('new', 'tea', 2), name: 'Renamed' } },
        SEQ + 2
      );

      expect(select(added).count).toBe(4);
      expect(select(updated).count).toBe(4);
      expect(select(updated).entities['new']?.name).toBe('Renamed');
      expect(select(updated).seq).toBe(SEQ + 2);
    });

    it('removes an item', () => {
      const state = receive(loaded(), { type: ServerEventType.ItemDeleted, id: 'oolong' });

      expect(ids(select(state).items)).toEqual(['miso', 'sencha']);
    });

    it('keeps categories sorted when one moves', () => {
      const state = receive(loaded(), {
        type: ServerEventType.CategoryUpserted,
        category: { ...category('soup', 5), version: 2 }
      });

      expect(ids(select(state).categories)).toEqual(['tea', 'empty', 'soup']);
    });

    it('removes a category', () => {
      const state = receive(loaded(), { type: ServerEventType.CategoryDeleted, id: 'empty' });

      expect(ids(select(state).categories)).toEqual(['soup', 'tea']);
    });

    it('advances seq on events it does not store', () => {
      const state = receive(loaded(), { type: ServerEventType.Resync });

      expect(select(state).seq).toBe(SEQ + 1);
      expect(select(state).count).toBe(3);
    });

    it.each([SEQ, SEQ - 1])('ignores a replayed event with seq %i', (seq) => {
      const state = receive(loaded(), { type: ServerEventType.ItemDeleted, id: 'oolong' }, seq);

      expect(select(state).count).toBe(3);
      expect(select(state).seq).toBe(SEQ);
    });

    it('ignores events before the first snapshot', () => {
      const initial = reducer(undefined, { type: 'init' });

      const state = receive(initial, { type: ServerEventType.ItemUpserted, item: item('a', 'b') });

      expect(state).toBe(initial);
    });
  });

  describe('category filter selectors', () => {
    it('sorts categories by position', () => {
      expect(ids(select(loaded()).categories)).toEqual(['soup', 'tea', 'empty']);
    });

    it('hides empty categories', () => {
      expect(ids(select(loaded()).visible)).toEqual(['soup', 'tea']);
    });

    it('hides a category once its last item goes', () => {
      const state = receive(loaded(), { type: ServerEventType.ItemDeleted, id: 'miso' });

      expect(ids(select(state).visible)).toEqual(['tea']);
    });

    it('counts unavailable items, so their category stays visible', () => {
      const state = receive(loaded(), {
        type: ServerEventType.ItemUpserted,
        item: { ...item('miso', 'soup', 2), isAvailable: false }
      });

      expect(ids(select(state).visible)).toEqual(['soup', 'tea']);
    });

    it('selects the items of one category', () => {
      const root = { menu: loaded() };

      expect(ids(selectItemsInCategory('tea')(root))).toEqual(['oolong', 'sencha']);
      expect(selectItemsInCategory('empty')(root)).toEqual([]);
    });

    it('is memoized until the items change', () => {
      const selector = selectItemsInCategory('tea');
      const state = loaded();
      const first = selector({ menu: state });

      const unrelated = reducer(state, menuActions.load());

      expect(selector({ menu: unrelated })).toBe(first);
    });
  });
});
