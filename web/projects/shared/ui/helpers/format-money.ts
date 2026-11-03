import type { Cents } from '@restaurant/contracts';

import { CENTS_PER_DOLLAR, MONEY_FORMAT } from '../config/money.config';

export function formatMoney(cents: Cents): string {
  return MONEY_FORMAT.format(cents / CENTS_PER_DOLLAR);
}
