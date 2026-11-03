import type { EntityState } from '@ngrx/entity';

import type { Category, MenuItem } from '@restaurant/contracts';

export enum LoadStatus {
  Idle = 'idle',
  Loading = 'loading',
  Loaded = 'loaded',
  Failed = 'failed'
}

export interface MenuState {
  categories: EntityState<Category>;
  items: EntityState<MenuItem>;
  loadStatus: LoadStatus;
  error: string | null;
  seq: number | null;
}
