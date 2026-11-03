import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { MoneyPipe } from '@shared/ui';
import type { CartSummary } from '@menu/models/cart.model';

@Component({
  selector: 'app-cart-summary',
  imports: [MoneyPipe],
  templateUrl: './cart-summary.component.html',
  styleUrl: './cart-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartSummaryComponent {
  readonly summary = input.required<CartSummary>();
}
