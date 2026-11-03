import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent, MoneyPipe, PluralizePipe } from '@shared/ui';
import type { CartSummary } from '@menu/models/cart.model';

@Component({
  selector: 'app-cart-bar',
  imports: [IconComponent, MoneyPipe, PluralizePipe],
  templateUrl: './cart-bar.component.html',
  styleUrl: './cart-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartBarComponent {
  readonly summary = input.required<CartSummary>();
  readonly opened = output();
}
