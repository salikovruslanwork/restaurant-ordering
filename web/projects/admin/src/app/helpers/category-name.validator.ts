import type { ValidatorFn } from '@angular/forms';

import { CATEGORY_NAME_MAX_LENGTH } from '@admin/config/categories.config';

// The server trims names and compares them case-insensitively, so the form does the same.
export function categoryNameValidator(otherNames: () => string[]): ValidatorFn {
  return (control) => {
    const name = String(control.value ?? '').trim();
    if (!name) {
      return { required: true };
    }
    if (name.length > CATEGORY_NAME_MAX_LENGTH) {
      return { maxlength: true };
    }
    const lowerCaseName = name.toLowerCase();
    const isTaken = otherNames().some((other) => other.toLowerCase() === lowerCaseName);
    return isTaken ? { taken: true } : null;
  };
}
