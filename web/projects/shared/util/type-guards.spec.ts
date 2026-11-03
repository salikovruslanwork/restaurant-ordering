import { ApiErrorCode, ServerEventType } from '@restaurant/contracts';

import { isApiError, isEventEnvelope } from './type-guards';

describe('isApiError', () => {
  it('accepts an object with a code and a message', () => {
    expect(isApiError({ code: ApiErrorCode.NotFound, message: 'x' })).toBe(true);
  });

  it.each([
    [null],
    ['<html>Bad gateway</html>'],
    [{}],
    [{ code: 1, message: 'x' }],
    [{ code: 'x' }]
  ])('rejects %j', (value) => {
    expect(isApiError(value)).toBe(false);
  });
});

describe('isEventEnvelope', () => {
  it('accepts an object with a seq and an event', () => {
    expect(isEventEnvelope({ seq: 1, event: { type: ServerEventType.Resync } })).toBe(true);
  });

  it.each([[null], ['text'], [{ event: {} }], [{ seq: '1', event: {} }], [{ seq: 1, event: 'x' }]])(
    'rejects %j',
    (value) => {
      expect(isEventEnvelope(value)).toBe(false);
    }
  );
});
