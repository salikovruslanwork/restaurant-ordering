import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CartChangeKind } from '@restaurant/contracts';
import {
  ButtonComponent,
  ButtonSize,
  ButtonVariant,
  DishImageComponent,
  DishImageSize,
  IconComponent,
  MoneyPipe
} from '@shared/ui';
import { QuantityStepperComponent } from '@menu/components/blocks/quantity-stepper/quantity-stepper.component';
import type { CartLineView } from '@menu/models/cart.model';

@Component({
  selector: 'app-cart-line',
  imports: [
    ButtonComponent,
    DishImageComponent,
    IconComponent,
    MoneyPipe,
    QuantityStepperComponent
  ],
  templateUrl: './cart-line.component.html',
  styleUrl: './cart-line.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartLineComponent {
  readonly line = input.required<CartLineView>();

  readonly quantityChanged = output<number>();
  readonly removed = output();

  protected readonly CartChangeKind = CartChangeKind;
  protected readonly ButtonSize = ButtonSize;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly DishImageSize = DishImageSize;
}
