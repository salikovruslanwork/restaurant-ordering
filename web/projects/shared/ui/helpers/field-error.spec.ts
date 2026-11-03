import { DEFAULT_FIELD_ERROR } from '../config/text-field.config';
import { fieldErrorMessage } from './field-error';

describe('fieldErrorMessage', () => {
  it('returns nothing without errors', () => {
    expect(fieldErrorMessage(null, {})).toBeNull();
    expect(fieldErrorMessage({}, {})).toBeNull();
  });

  it('prefers the configured message', () => {
    expect(fieldErrorMessage({ required: true }, { required: 'Enter a name' })).toBe(
      'Enter a name'
    );
  });

  it('uses a string error value as the message, for server errors', () => {
    expect(fieldErrorMessage({ server: 'Name taken' }, {})).toBe('Name taken');
  });

  it('falls back to a generic message', () => {
    expect(fieldErrorMessage({ required: true }, {})).toBe(DEFAULT_FIELD_ERROR);
  });

  it('shows the first error', () => {
    const messages = { required: 'First', min: 'Second' };

    expect(fieldErrorMessage({ required: true, min: true }, messages)).toBe('First');
  });
});
