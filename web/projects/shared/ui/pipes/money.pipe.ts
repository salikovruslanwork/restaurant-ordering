import { Pipe, type PipeTransform } from '@angular/core';

import type { Cents } from '@restaurant/contracts';

import { formatMoney } from '../helpers/format-money';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: Cents): string {
    return formatMoney(cents);
  }
}
