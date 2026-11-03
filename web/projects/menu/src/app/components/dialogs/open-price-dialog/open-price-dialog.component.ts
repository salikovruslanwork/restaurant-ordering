import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  ButtonComponent,
  ButtonVariant,
  DIALOG,
  DIALOG_DATA,
  DialogRef,
  DishImageComponent,
  DishImageSize,
  formatMoney,
  IconComponent,
  moneyValidator,
  TextFieldComponent,
  TextFieldType
} from '@shared/ui';
import { parseMoney } from '@shared/util';
import { QuantityStepperComponent } from '@menu/components/blocks/quantity-stepper/quantity-stepper.component';
import {
  MAX_OPEN_PRICE_CENTS,
  OPEN_PRICE_ERRORS,
  OPEN_PRICE_HINT,
  OPEN_PRICE_NOTE
} from '@menu/config/cart.config';
import type { OpenPriceChoice, OpenPriceDialogData } from '@menu/models/cart.model';

@Component({
  selector: 'app-open-price-dialog',
  imports: [
    ...DIALOG,
    ButtonComponent,
    DishImageComponent,
    IconComponent,
    QuantityStepperComponent,
    ReactiveFormsModule,
    TextFieldComponent
  ],
  templateUrl: './open-price-dialog.component.html',
  styleUrl: './open-price-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OpenPriceDialogComponent {
  private readonly ref = inject<DialogRef<OpenPriceChoice>>(DialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly item = inject<OpenPriceDialogData>(DIALOG_DATA).item;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly TextFieldType = TextFieldType;
  protected readonly DishImageSize = DishImageSize;
  protected readonly errors = OPEN_PRICE_ERRORS;
  protected readonly hint = OPEN_PRICE_HINT;
  protected readonly note = OPEN_PRICE_NOTE;

  protected readonly price = new FormControl('', {
    nonNullable: true,
    validators: moneyValidator(() => MAX_OPEN_PRICE_CENTS)
  });
  protected readonly quantity = signal(1);
  private readonly priceText = toSignal(this.price.valueChanges, { initialValue: '' });
  protected readonly submitLabel = computed(() =>
    this.getSubmitLabel(this.priceText(), this.quantity())
  );

  constructor() {
    afterNextRender(() => this.host.nativeElement.querySelector('input')?.focus(), {
      injector: this.injector
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.price.markAsTouched();
    const price = parseMoney(this.price.value);
    if (this.price.invalid || price === null) {
      this.host.nativeElement.querySelector('input')?.focus();
      return;
    }
    this.ref.close({ price, quantity: this.quantity() });
  }

  protected close(): void {
    this.ref.close();
  }

  private getSubmitLabel(text: string, quantity: number): string {
    const price = parseMoney(text);
    return price !== null && this.price.valid
      ? `Add to cart · ${formatMoney(price * quantity)}`
      : 'Add to cart';
  }
}
