import { OrderStatus, ServerEventType, type ServerEvent } from '@restaurant/contracts';
import { LoadStatus, realtimeActions } from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';
import type { MyOrdersState } from '@menu/models/my-orders.model';
import { checkoutActions } from '@menu/store/checkout/checkout.actions';

import { myOrdersActions } from './my-orders.actions';
import { myOrdersFeature } from './my-orders.reducer';

const { reducer } = myOrdersFeature;

function apply(...actions: Parameters<typeof reducer>[1][]): MyOrdersState {
  return actions.reduce(
    (state, action) => reducer(state, action),
    reducer(undefined, { type: 'init' })
  );
}

const event = (seq: number, serverEvent: ServerEvent) =>
  realtimeActions.eventReceived({
    envelope: { seq, at: '2026-11-02T12:00:00.000Z', event: serverEvent }
  });
const loaded = (seq = 5, orders = [makeOrder()]) =>
  myOrdersActions.loadSucceeded({ snapshot: { orders, seq } });
const all = (state: MyOrdersState) => myOrdersFeature.selectAllOrders.projector(state.orders);

describe('myOrders reducer', () => {
  it('loads the snapshot, newest order first', () => {
    const older = makeOrder({ id: 'a', number: 1001 });
    const newer = makeOrder({ id: 'b', number: 1002 });

    const loading = apply(myOrdersActions.load());
    const state = apply(myOrdersActions.load(), loaded(5, [older, newer]));

    expect(loading.loadStatus).toBe(LoadStatus.Loading);
    expect(state).toMatchObject({ loadStatus: LoadStatus.Loaded, seq: 5, error: null });
    expect(all(state)).toEqual([newer, older]);
  });

  it('keeps the error message of a failed load', () => {
    expect(apply(myOrdersActions.loadFailed({ message: 'Offline' }))).toMatchObject({
      loadStatus: LoadStatus.Failed,
      error: 'Offline'
    });
  });

  it('ignores order events before the snapshot and those it already contains', () => {
    const preparing = makeOrder({ status: OrderStatus.Preparing, version: 2 });
    const update = { type: ServerEventType.OrderUpdated, order: preparing } as const;

    expect(all(apply(event(3, update)))).toEqual([]);
    expect(all(apply(loaded(5), event(5, update)))).toEqual([makeOrder()]);
    expect(all(apply(loaded(5), event(6, update)))).toEqual([preparing]);
  });

  it('adds created orders and keeps the newer version of an order', () => {
    const created = makeOrder({ id: 'b', number: 1002 });
    const state = apply(
      loaded(5, [makeOrder({ version: 3, status: OrderStatus.Preparing })]),
      event(6, { type: ServerEventType.OrderCreated, order: created }),
      event(7, { type: ServerEventType.OrderUpdated, order: makeOrder({ version: 2 }) }),
      event(8, { type: ServerEventType.ItemDeleted, id: 'x' })
    );

    expect(all(state).map(({ id, version }) => [id, version])).toEqual([
      ['b', 1],
      ['o1', 3]
    ]);
    expect(state.seq).toBe(8);
  });

  it('keeps a newer order when an older snapshot arrives', () => {
    const preparing = makeOrder({ version: 3, status: OrderStatus.Preparing });
    const state = apply(
      loaded(5),
      event(6, { type: ServerEventType.OrderUpdated, order: preparing }),
      loaded(5, [makeOrder({ version: 2 })])
    );

    expect(all(state)).toEqual([preparing]);
  });

  it('adds an order placed at checkout before its event arrives', () => {
    const placed = makeOrder({ id: 'b', number: 1002 });

    expect(all(apply(checkoutActions.orderPlaced({ order: placed })))).toEqual([placed]);
  });

  it('marks changed orders as fresh until they end', () => {
    const a = makeOrder({ id: 'a' });
    const b = makeOrder({ id: 'b' });
    const state = apply(
      myOrdersActions.statusesChanged({ orders: [a] }),
      myOrdersActions.statusesChanged({ orders: [a, b] })
    );

    expect(state.freshIds).toEqual(['a', 'b']);
    expect(reducer(state, myOrdersActions.freshEnded({ ids: ['a'] })).freshIds).toEqual(['b']);
  });
});
