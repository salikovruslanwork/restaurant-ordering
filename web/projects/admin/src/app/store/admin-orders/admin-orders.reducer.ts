import { createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import {
  OrderStatus,
  ServerEventType,
  type Id,
  type Order,
  type ServerEvent
} from '@restaurant/contracts';
import { LoadStatus, omitKey, realtimeActions, upsertNewer } from '@shared/data-access';
import { STATUS_CHIP } from '@shared/ui';
import { mergeSnapshot } from '@shared/util';
import { ORDER_FILTER_STATUSES } from '@admin/config/orders.config';
import { toOrderRows, toStatusFilterOptions } from '@admin/helpers/orders';
import type { AdminOrdersState } from '@admin/models/admin-orders.model';

import { adminOrdersActions } from './admin-orders.actions';

const ordersAdapter = createEntityAdapter<Order>({
  sortComparer: (a, b) => b.number - a.number
});

const initialState: AdminOrdersState = {
  orders: ordersAdapter.getInitialState(),
  loadStatus: LoadStatus.Idle,
  error: null,
  seq: null,
  statusFilter: null,
  pending: {},
  freshIds: []
};

function withOrder(state: AdminOrdersState, order: Order): AdminOrdersState {
  return { ...state, orders: upsertNewer(ordersAdapter, state.orders, order) };
}

function applyEvent(state: AdminOrdersState, event: ServerEvent): AdminOrdersState {
  switch (event.type) {
    case ServerEventType.OrderCreated:
      return {
        ...withOrder(state, event.order),
        freshIds: [...state.freshIds, event.order.id]
      };
    case ServerEventType.OrderUpdated:
      return withOrder(state, event.order);
    default:
      return state;
  }
}

// After a reload, orders this tab hadn't seen yet are highlighted like live ones.
function newIds(state: AdminOrdersState, orders: Order[]): Id[] {
  if (state.loadStatus === LoadStatus.Idle || state.seq === null) {
    return [];
  }
  return orders.map(({ id }) => id).filter((id) => !(id in state.orders.entities));
}

export const adminOrdersFeature = createFeature({
  name: 'adminOrders',
  reducer: createReducer(
    initialState,
    on(adminOrdersActions.load, (state): AdminOrdersState => ({
      ...state,
      loadStatus: LoadStatus.Loading
    })),
    on(adminOrdersActions.loadSucceeded, (state, { snapshot }): AdminOrdersState => ({
      ...state,
      orders: ordersAdapter.setAll(
        mergeSnapshot(state.orders.entities, snapshot.orders),
        state.orders
      ),
      loadStatus: LoadStatus.Loaded,
      error: null,
      seq: snapshot.seq,
      freshIds: [...state.freshIds, ...newIds(state, snapshot.orders)]
    })),
    on(adminOrdersActions.loadFailed, (state, { message }): AdminOrdersState => ({
      ...state,
      loadStatus: LoadStatus.Failed,
      error: message
    })),
    // Events the snapshot already contains are skipped; an order only moves to a newer version.
    on(realtimeActions.eventReceived, (state, { envelope }): AdminOrdersState => {
      if (state.seq === null || envelope.seq <= state.seq) {
        return state;
      }
      return applyEvent({ ...state, seq: envelope.seq }, envelope.event);
    }),
    on(adminOrdersActions.filterByStatus, (state, { status }): AdminOrdersState => ({
      ...state,
      statusFilter: status
    })),
    on(adminOrdersActions.changeStatus, (state, { order, target }): AdminOrdersState => ({
      ...state,
      pending: { ...state.pending, [order.id]: { previous: order, target } }
    })),
    on(adminOrdersActions.statusChanged, (state, { order }): AdminOrdersState => ({
      ...withOrder(state, order),
      pending: omitKey(state.pending, order.id)
    })),
    on(adminOrdersActions.statusConflict, (state, { order, latest }): AdminOrdersState => ({
      ...(latest ? withOrder(state, latest) : state),
      pending: omitKey(state.pending, order.id)
    })),
    on(adminOrdersActions.statusChangeFailed, (state, { order }): AdminOrdersState => ({
      ...state,
      pending: omitKey(state.pending, order.id)
    })),
    on(adminOrdersActions.freshEnded, (state, { ids }): AdminOrdersState => ({
      ...state,
      freshIds: state.freshIds.filter((id) => !ids.includes(id))
    }))
  ),
  extraSelectors: ({ selectOrders, selectStatusFilter, selectPending, selectFreshIds }) => {
    const { selectAll } = ordersAdapter.getSelectors();
    const selectAllOrders = createSelector(selectOrders, selectAll);
    return {
      selectAllOrders,
      selectOrderRows: createSelector(
        selectAllOrders,
        selectStatusFilter,
        selectPending,
        selectFreshIds,
        toOrderRows
      ),
      selectStatusFilterOptions: createSelector(selectAllOrders, (orders) =>
        toStatusFilterOptions(orders, ORDER_FILTER_STATUSES, STATUS_CHIP)
      ),
      selectPlacedCount: createSelector(
        selectAllOrders,
        (orders) => orders.filter(({ status }) => status === OrderStatus.Placed).length
      )
    };
  }
});
