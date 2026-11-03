import type { ValidatorFn } from '@angular/forms';

import type { Cents } from '@restaurant/contracts';
import { parseMoney } from '@shared/util';

// The limit is read on every check, so it can follow a changing value like a cart subtotal.
export function moneyValidator(max: () => Cents): ValidatorFn {
  return (control) => {
    const text = String(control.value ?? '').trim();
    if (!text) {
      return { required: true };
    }
    const cents = parseMoney(text);
    if (cents === null) {
      return { format: true };
    }
    if (cents <= 0) {
      return { min: true };
    }
    return cents > max() ? { max: true } : null;
  };
}
