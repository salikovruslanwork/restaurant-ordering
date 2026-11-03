import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport
} from '@angular/cdk/scrolling';

import { PricingKind, type Id } from '@restaurant/contracts';
import {
  ButtonComponent,
  ButtonVariant,
  DishImageComponent,
  DishImageSize,
  MoneyComponent,
  MoneyVariant,
  SavingIndicatorComponent,
  SwitchComponent
} from '@shared/ui';
import { ITEM_TABLE_ROW_HEIGHT } from '@admin/config/items.config';
import type { ItemAvailabilityChange, ItemRow } from '@admin/models/item-list.model';

@Component({
  selector: 'app-items-table',
  imports: [
    ButtonComponent,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    DishImageComponent,
    MoneyComponent,
    SavingIndicatorComponent,
    SwitchComponent
  ],
  templateUrl: './items-table.component.html',
  styleUrl: './items-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemsTableComponent {
  readonly rows = input.required<ItemRow[]>();
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly freshIds = input<ReadonlySet<Id>>(new Set());

  readonly availabilityChanged = output<ItemAvailabilityChange>();
  readonly editRequested = output<Id>();
  readonly deleteRequested = output<ItemRow>();

  protected readonly rowHeight = ITEM_TABLE_ROW_HEIGHT;
  protected readonly PricingKind = PricingKind;
  protected readonly MoneyVariant = MoneyVariant;
  protected readonly DishImageSize = DishImageSize;
  protected readonly ButtonVariant = ButtonVariant;

  protected trackById(_index: number, row: ItemRow): Id {
    return row.id;
  }
}
