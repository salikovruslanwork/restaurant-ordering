import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { PricingKind } from '@restaurant/contracts';
import {
  ActionMenuComponent,
  DishImageComponent,
  DishImageSize,
  MoneyComponent,
  MoneyVariant,
  SwitchComponent,
  type ActionMenuItem
} from '@shared/ui';
import { ITEM_DELETE_ACTION, ITEM_EDIT_ACTION } from '@admin/config/items.config';
import type { ItemRow } from '@admin/models/item-list.model';

@Component({
  selector: 'app-item-admin-card',
  imports: [ActionMenuComponent, DishImageComponent, MoneyComponent, SwitchComponent],
  templateUrl: './item-admin-card.component.html',
  styleUrl: './item-admin-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemAdminCardComponent {
  readonly row = input.required<ItemRow>();
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly fresh = input(false, { transform: booleanAttribute });

  readonly availabilityChanged = output<boolean>();
  readonly editRequested = output();
  readonly deleteRequested = output();

  protected readonly actions = [ITEM_EDIT_ACTION, ITEM_DELETE_ACTION];
  protected readonly PricingKind = PricingKind;
  protected readonly MoneyVariant = MoneyVariant;
  protected readonly DishImageSize = DishImageSize;

  protected select(action: ActionMenuItem): void {
    if (action === ITEM_DELETE_ACTION) {
      this.deleteRequested.emit();
    } else {
      this.editRequested.emit();
    }
  }
}
