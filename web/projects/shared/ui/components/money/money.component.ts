import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Cents } from '@restaurant/contracts';

import { OPEN_PRICE_CHIP_LABEL, OPEN_PRICE_LABEL } from '../../config/money.config';
import { MoneyVariant } from '../../models/money.model';
import { MoneyPipe } from '../../pipes/money.pipe';

@Component({
  selector: 'app-money',
  imports: [MoneyPipe],
  templateUrl: './money.component.html',
  styleUrl: './money.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoneyComponent {
  readonly amount = input<Cents | null>(null);
  readonly previousAmount = input<Cents | null>(null);
  readonly variant = input(MoneyVariant.Default);
  readonly small = input(false, { transform: booleanAttribute });

  protected readonly MoneyVariant = MoneyVariant;
  protected readonly openLabel = OPEN_PRICE_LABEL;
  protected readonly openChipLabel = OPEN_PRICE_CHIP_LABEL;
}
