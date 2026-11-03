import type { EntityAdapter, EntityState } from '@ngrx/entity';

import type { Id } from '@restaurant/contracts';

export function upsertNewer<T extends { id: Id; version: number }>(
  adapter: EntityAdapter<T>,
  state: EntityState<T>,
  entity: T
): EntityState<T> {
  const current = state.entities[entity.id];
  return current && current.version >= entity.version ? state : adapter.upsertOne(entity, state);
}

export function omitKey<T>(record: Record<Id, T>, key: Id): Record<Id, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => id !== key));
}
