import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Id } from '@restaurant/contracts';
import {
  ButtonComponent,
  ButtonSize,
  ButtonVariant,
  MoneyComponent,
  StatusChipComponent,
  TimeAgoPipe
} from '@shared/ui';
import { OrderActionsComponent } from '@admin/components/blocks/order-actions/order-actions.component';
import { OrderLinesComponent } from '@admin/components/blocks/order-lines/order-lines.component';
import type { OrderRow, OrderStatusChange } from '@admin/models/admin-orders.model';

@Component({
  selector: 'app-orders-table',
  imports: [
    ButtonComponent,
    MoneyComponent,
    OrderActionsComponent,
    OrderLinesComponent,
    StatusChipComponent,
    TimeAgoPipe
  ],
  templateUrl: './orders-table.component.html',
  styleUrl: './orders-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersTableComponent {
  readonly rows = input.required<OrderRow[]>();
  readonly expandedIds = input<ReadonlySet<Id>>(new Set());
  readonly now = input.required<number>();
  readonly readOnly = input(false, { transform: booleanAttribute });

  readonly toggled = output<Id>();
  readonly statusChanged = output<OrderStatusChange>();

  protected readonly ButtonSize = ButtonSize;
  protected readonly ButtonVariant = ButtonVariant;
}
