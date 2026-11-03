import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
  output
} from '@angular/core';

import { IconComponent } from '@shared/ui';
import { MAX_QUANTITY } from '@menu/config/cart.config';

@Component({
  selector: 'app-quantity-stepper',
  imports: [IconComponent],
  templateUrl: './quantity-stepper.component.html',
  styleUrl: './quantity-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuantityStepperComponent {
  readonly value = input.required<number>();
  readonly name = input.required<string>();
  readonly min = input(0, { transform: numberAttribute });
  readonly small = input(false, { transform: booleanAttribute });

  readonly changed = output<number>();

  protected readonly max = MAX_QUANTITY;
}
