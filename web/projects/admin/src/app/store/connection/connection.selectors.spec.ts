import { ConnectionStatus } from '@shared/data-access';

import { selectIsReadOnly } from './connection.selectors';

describe('connection selectors', () => {
  it.each([
    [ConnectionStatus.Live, false],
    [ConnectionStatus.Reconnecting, true],
    [ConnectionStatus.Offline, true]
  ])('is read-only unless live (%s)', (status, expected) => {
    expect(selectIsReadOnly({ connection: { status } })).toBe(expected);
  });
});
