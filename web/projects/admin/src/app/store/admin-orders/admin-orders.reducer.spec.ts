import { OrderStatus, ServerEventType, type Order, type ServerEvent } from '@restaurant/contracts';
import { LoadStatus, realtimeActions } from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';
import type { AdminOrdersState } from '@admin/models/admin-orders.model';

import { adminOrdersActions } from './admin-orders.actions';
import { adminOrdersFeature } from './admin-orders.reducer';

const { reducer } = adminOrdersFeature;

function loaded(orders: Order[] = [makeOrder()], seq = 10): AdminOrdersState {
  return reducer(undefined, adminOrdersActions.loadSucceeded({ snapshot: { orders, seq } }));
}

function receive(state: AdminOrdersState, event: ServerEvent, seq: number): AdminOrdersState {
  return reducer(
    state,
    realtimeActions.eventReceived({ envelope: { seq, at: '2026-11-02T12:00:00.000Z', event } })
  );
}

const select = (state: AdminOrdersState) => {
  const root = { adminOrders: state };
  return {
    all: adminOrdersFeature.selectAllOrders(root),
    rows: adminOrdersFeature.selectOrderRows(root),
    placed: adminOrdersFeature.selectPlacedCount(root),
    options: adminOrdersFeature.selectStatusFilterOptions(root)
  };
};

describe('adminOrders reducer', () => {
  it('loads a snapshot, newest first, with nothing highlighted', () => {
    const state = loaded([makeOrder(), makeOrder({ id: 'o2', number: 1002 })]);

    expect(state.loadStatus).toBe(LoadStatus.Loaded);
    expect(state.seq).toBe(10);
    expect(select(state).all.map(({ number }) => number)).toEqual([1002, 1001]);
    expect(state.freshIds).toEqual([]);
  });

  it('marks loading and keeps data on a failed load', () => {
    const loading = reducer(loaded(), adminOrdersActions.load());
    expect(loading.loadStatus).toBe(LoadStatus.Loading);

    const failed = reducer(loading, adminOrdersActions.loadFailed({ message: 'Offline' }));
    expect(failed).toMatchObject({ loadStatus: LoadStatus.Failed, error: 'Offline' });
    expect(select(failed).all).toHaveLength(1);
  });

  it('keeps a newer order when an older snapshot arrives after its event', () => {
    const preparing = makeOrder({ status: OrderStatus.Preparing, version: 2 });
    const updated = receive(loaded(), { type: ServerEventType.OrderUpdated, order: preparing }, 11);

    const state = reducer(
      updated,
      adminOrdersActions.loadSucceeded({ snapshot: { orders: [makeOrder()], seq: 10 } })
    );

    expect(select(state).all).toEqual([preparing]);
  });

  it('highlights orders a later snapshot brings that weren’t known', () => {
    const state = reducer(
      loaded(),
      adminOrdersActions.loadSucceeded({
        snapshot: { orders: [makeOrder(), makeOrder({ id: 'o2', number: 1002 })], seq: 12 }
      })
    );

    expect(state.freshIds).toEqual(['o2']);
  });

  describe('events', () => {
    it('ignores events before the first snapshot or already in it', () => {
      const created = {
        type: ServerEventType.OrderCreated,
        order: makeOrder({ id: 'o2' })
      } as const;
      const before = reducer(undefined, { type: 'init' });

      expect(receive(before, created, 5)).toBe(before);
      expect(receive(loaded(), created, 10)).toEqual(loaded());
    });

    it('adds a new order and highlights it', () => {
      const state = receive(
        loaded(),
        { type: ServerEventType.OrderCreated, order: makeOrder({ id: 'o2', number: 1002 }) },
        11
      );

      expect(select(state).all).toHaveLength(2);
      expect(state.freshIds).toEqual(['o2']);
      expect(state.seq).toBe(11);
    });

    it('updates an order only to a newer version', () => {
      const preparing = makeOrder({ status: OrderStatus.Preparing, version: 2 });
      const updated = receive(
        loaded(),
        { type: ServerEventType.OrderUpdated, order: preparing },
        11
      );
      expect(select(updated).all[0]?.status).toBe(OrderStatus.Preparing);

      const stale = receive(
        updated,
        { type: ServerEventType.OrderUpdated, order: makeOrder() },
        12
      );
      expect(select(stale).all[0]?.status).toBe(OrderStatus.Preparing);
      expect(stale.seq).toBe(12);
    });

    it('moves the seq on for other events', () => {
      const state = receive(loaded(), { type: ServerEventType.CategoryDeleted, id: 'x' }, 11);

      expect(state.seq).toBe(11);
      expect(select(state).all).toHaveLength(1);
    });
  });

  it('filters by status', () => {
    const state = reducer(
      loaded(),
      adminOrdersActions.filterByStatus({ status: OrderStatus.Ready })
    );

    expect(state.statusFilter).toBe(OrderStatus.Ready);
    expect(select(state).rows).toEqual([]);
  });

  describe('status changes', () => {
    const order = makeOrder();
    const changing = () =>
      reducer(loaded(), adminOrdersActions.changeStatus({ order, target: OrderStatus.Preparing }));

    it('shows the change at once while it saves, without touching the stored order', () => {
      const state = changing();

      expect(select(state).rows[0]).toMatchObject({
        isSaving: true,
        order: { status: OrderStatus.Preparing }
      });
      expect(select(state).all[0]?.status).toBe(OrderStatus.Placed);
      expect(select(state).placed).toBe(1);
    });

    it('stores the server’s order when it succeeds', () => {
      const saved = { ...order, status: OrderStatus.Preparing, version: 2 };
      const state = reducer(changing(), adminOrdersActions.statusChanged({ order: saved }));

      expect(state.pending).toEqual({});
      expect(select(state).all[0]).toEqual(saved);
      expect(select(state).placed).toBe(0);
    });

    it('rolls back on failure, to the latest order when there is one', () => {
      const failed = reducer(
        changing(),
        adminOrdersActions.statusChangeFailed({
          order,
          target: OrderStatus.Preparing,
          error: 'Offline'
        })
      );
      expect(select(failed).rows[0]).toMatchObject({
        isSaving: false,
        order: { status: OrderStatus.Placed }
      });

      const latest = { ...order, status: OrderStatus.Cancelled, version: 2 };
      const conflict = reducer(changing(), adminOrdersActions.statusConflict({ order, latest }));
      expect(select(conflict).rows[0]?.order.status).toBe(OrderStatus.Cancelled);
    });
  });

  it('ends highlights', () => {
    const fresh = receive(
      loaded(),
      { type: ServerEventType.OrderCreated, order: makeOrder({ id: 'o2' }) },
      11
    );

    expect(reducer(fresh, adminOrdersActions.freshEnded({ ids: ['o2'] })).freshIds).toEqual([]);
  });

  it('counts each status for the filter', () => {
    expect(select(loaded()).options.slice(0, 2)).toEqual([
      { status: null, label: 'All', count: 1 },
      { status: OrderStatus.Placed, label: 'Placed', count: 1 }
    ]);
  });
});
