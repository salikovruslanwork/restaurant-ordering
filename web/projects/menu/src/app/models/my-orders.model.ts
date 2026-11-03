import type { EntityState } from '@ngrx/entity';

import type { Id, Order } from '@restaurant/contracts';
import type { LoadStatus } from '@shared/data-access';

export interface MyOrdersState {
  orders: EntityState<Order>;
  loadStatus: LoadStatus;
  error: string | null;
  seq: number | null;
  freshIds: Id[];
}

export interface OrderProgressStep {
  label: string;
  isDone: boolean;
  isCurrent: boolean;
  hasCheck: boolean;
}
