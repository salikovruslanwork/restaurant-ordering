import type { Id } from '@restaurant/contracts';

import type { MoveDirection } from './menu-editor.model';

export interface CategoryRow {
  id: Id;
  name: string;
  itemCount: number;
}

export interface CategoryMove {
  id: Id;
  direction: MoveDirection;
}
