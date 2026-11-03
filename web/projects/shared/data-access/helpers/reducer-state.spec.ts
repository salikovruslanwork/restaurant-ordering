import { createEntityAdapter } from '@ngrx/entity';

import { omitKey, upsertNewer } from './reducer-state';

const adapter = createEntityAdapter<{ id: string; version: number }>();

describe('upsertNewer', () => {
  const state = adapter.setAll([{ id: 'a', version: 2 }], adapter.getInitialState());

  it('adds an unknown entity and replaces an older one', () => {
    const added = upsertNewer(adapter, state, { id: 'b', version: 1 });
    expect(added.entities['b']).toEqual({ id: 'b', version: 1 });

    const updated = upsertNewer(adapter, state, { id: 'a', version: 3 });
    expect(updated.entities['a']?.version).toBe(3);
  });

  it('keeps the current entity when the new one is not newer', () => {
    expect(upsertNewer(adapter, state, { id: 'a', version: 2 })).toBe(state);
    expect(upsertNewer(adapter, state, { id: 'a', version: 1 })).toBe(state);
  });
});

describe('omitKey', () => {
  it('removes only the given key', () => {
    expect(omitKey({ a: 1, b: 2 }, 'a')).toEqual({ b: 2 });
  });
});
