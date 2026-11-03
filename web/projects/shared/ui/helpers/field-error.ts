import type { ValidationErrors } from '@angular/forms';

import { DEFAULT_FIELD_ERROR } from '../config/text-field.config';

// A string error value is a ready message, which is how server errors reach the form.
export function fieldErrorMessage(
  errors: ValidationErrors | null,
  messages: Record<string, string>
): string | null {
  const [entry] = Object.entries<unknown>(errors ?? {});
  if (!entry) {
    return null;
  }
  const [key, value] = entry;
  return messages[key] ?? (typeof value === 'string' ? value : DEFAULT_FIELD_ERROR);
}
