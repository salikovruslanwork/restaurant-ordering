import { createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import { ServerEventType, type Order } from '@restaurant/contracts';
import { LoadStatus, realtimeActions, upsertNewer } from '@shared/data-access';
import { mergeSnapshot } from '@shared/util';
import type { MyOrdersState } from '@menu/models/my-orders.model';
import { checkoutActions } from '@menu/store/checkout/checkout.actions';

import { myOrdersActions } from './my-orders.actions';

const ordersAdapter = createEntityAdapter<Order>({
  sortComparer: (a, b) => b.number - a.number
});

const initialState: MyOrdersState = {
  orders: ordersAdapter.getInitialState(),
  loadStatus: LoadStatus.Idle,
  error: null,
  seq: null,
  freshIds: []
};

function withOrder(state: MyOrdersState, order: Order): MyOrdersState {
  return { ...state, orders: upsertNewer(ordersAdapter, state.orders, order) };
}

export const myOrdersFeature = createFeature({
  name: 'myOrders',
  reducer: createReducer(
    initialState,
    on(myOrdersActions.load, (state): MyOrdersState => ({
      ...state,
      loadStatus: LoadStatus.Loading
    })),
    on(myOrdersActions.loadSucceeded, (state, { snapshot }): MyOrdersState => ({
      ...state,
      orders: ordersAdapter.setAll(
        mergeSnapshot(state.orders.entities, snapshot.orders),
        state.orders
      ),
      loadStatus: LoadStatus.Loaded,
      error: null,
      seq: snapshot.seq
    })),
    on(myOrdersActions.loadFailed, (state, { message }): MyOrdersState => ({
      ...state,
      loadStatus: LoadStatus.Failed,
      error: message
    })),
    // Events the snapshot already contains are skipped; an order only moves to a newer version.
    on(realtimeActions.eventReceived, (state, { envelope }): MyOrdersState => {
      const { event } = envelope;
      if (state.seq === null || envelope.seq <= state.seq) {
        return state;
      }
      const next = { ...state, seq: envelope.seq };
      return event.type === ServerEventType.OrderCreated ||
        event.type === ServerEventType.OrderUpdated
        ? withOrder(next, event.order)
        : next;
    }),
    on(checkoutActions.orderPlaced, (state, { order }): MyOrdersState => withOrder(state, order)),
    on(myOrdersActions.statusesChanged, (state, { orders }): MyOrdersState => ({
      ...state,
      freshIds: [...new Set([...state.freshIds, ...orders.map(({ id }) => id)])]
    })),
    on(myOrdersActions.freshEnded, (state, { ids }): MyOrdersState => ({
      ...state,
      freshIds: state.freshIds.filter((id) => !ids.includes(id))
    }))
  ),
  extraSelectors: ({ selectOrders }) => {
    const { selectAll } = ordersAdapter.getSelectors();
    return {
      selectAllOrders: createSelector(selectOrders, selectAll),
      selectOrderEntities: createSelector(selectOrders, ({ entities }) => entities)
    };
  }
});
