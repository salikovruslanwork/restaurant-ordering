import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import type { Cents } from '@restaurant/contracts';
import {
  ButtonComponent,
  ButtonVariant,
  formatMoney,
  IconComponent,
  MoneyPipe,
  moneyValidator,
  TextFieldComponent,
  TextFieldType
} from '@shared/ui';
import { parseMoney } from '@shared/util';
import { DISCOUNT_ERRORS } from '@menu/config/cart.config';

@Component({
  selector: 'app-cart-discount',
  imports: [ButtonComponent, IconComponent, MoneyPipe, ReactiveFormsModule, TextFieldComponent],
  templateUrl: './cart-discount.component.html',
  styleUrl: './cart-discount.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartDiscountComponent {
  // What the customer entered, and what the order gets after the cap.
  readonly discount = input.required<Cents>();
  readonly applied = input.required<Cents>();
  readonly subtotal = input.required<Cents>();

  readonly discountApplied = output<Cents>();
  readonly discountRemoved = output();

  protected readonly ButtonVariant = ButtonVariant;
  protected readonly TextFieldType = TextFieldType;
  protected readonly amount = new FormControl('', {
    nonNullable: true,
    validators: moneyValidator(() => this.subtotal())
  });

  protected readonly errors = computed(() => this.getErrors(this.subtotal()));

  protected apply(event: Event): void {
    event.preventDefault();
    this.amount.markAsTouched();
    this.amount.updateValueAndValidity();
    const cents = parseMoney(this.amount.value);
    if (this.amount.invalid || cents === null) {
      return;
    }
    this.discountApplied.emit(cents);
    this.amount.reset('');
  }

  private getErrors(subtotal: Cents): Record<string, string> {
    return {
      ...DISCOUNT_ERRORS,
      max: `Discount can’t exceed the subtotal (${formatMoney(subtotal)})`
    };
  }
}
