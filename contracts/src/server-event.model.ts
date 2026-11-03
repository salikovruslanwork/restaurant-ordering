import type { Id, IsoDate } from './common.model.js';
import type { Category, MenuItem } from './menu.model.js';
import type { Order } from './order.model.js';
import type { ServerEventType } from './server-event-type.enum.js';

export type ServerEvent =
  | { type: ServerEventType.CategoryUpserted; category: Category }
  | { type: ServerEventType.CategoryDeleted; id: Id }
  | { type: ServerEventType.ItemUpserted; item: MenuItem }
  | { type: ServerEventType.ItemDeleted; id: Id }
  | { type: ServerEventType.OrderCreated; order: Order }
  | { type: ServerEventType.OrderUpdated; order: Order }
  | { type: ServerEventType.Resync };

export interface EventEnvelope {
  seq: number;
  at: IsoDate;
  event: ServerEvent;
}
