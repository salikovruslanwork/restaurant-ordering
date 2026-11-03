import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  output,
  type EffectCleanupRegisterFn
} from '@angular/core';

import { PricingKind, type Cents, type MenuItem } from '@restaurant/contracts';
import {
  ButtonComponent,
  ButtonVariant,
  DishImageComponent,
  MoneyComponent,
  MoneyVariant
} from '@shared/ui';
import { QuantityStepperComponent } from '@menu/components/blocks/quantity-stepper/quantity-stepper.component';
import { PRICE_CHANGE_HOLD_MS } from '@menu/config/menu.config';

@Component({
  selector: 'app-menu-item',
  imports: [ButtonComponent, DishImageComponent, MoneyComponent, QuantityStepperComponent],
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuItemComponent {
  readonly item = input.required<MenuItem>();
  readonly quantity = input(0);

  readonly added = output();
  readonly quantityChanged = output<number>();
  readonly openPriceRequested = output();

  protected readonly PricingKind = PricingKind;
  protected readonly MoneyVariant = MoneyVariant;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly previousPrice = linkedSignal<MenuItem, Cents | null>({
    source: this.item,
    computation: (item, previous) => this.getPreviousPrice(item, previous)
  });

  constructor() {
    effect((onCleanup) => this.holdPreviousPrice(this.previousPrice(), onCleanup));
  }

  // Virtual scroll reuses this component for other dishes, so only the same id counts as a change.
  private getPreviousPrice(
    item: MenuItem,
    previous: { source: MenuItem; value: Cents | null } | undefined
  ): Cents | null {
    if (previous?.source.id !== item.id) {
      return null;
    }
    const last = this.getFixedPrice(previous.source);
    const price = this.getFixedPrice(item);
    return last !== null && price !== null && last !== price ? last : previous.value;
  }

  private getFixedPrice(item: MenuItem): Cents | null {
    return item.pricing.kind === PricingKind.Fixed ? item.pricing.price : null;
  }

  private holdPreviousPrice(previous: Cents | null, onCleanup: EffectCleanupRegisterFn): void {
    if (previous === null) {
      return;
    }
    const timer = setTimeout(() => this.previousPrice.set(null), PRICE_CHANGE_HOLD_MS);
    onCleanup(() => clearTimeout(timer));
  }
}
