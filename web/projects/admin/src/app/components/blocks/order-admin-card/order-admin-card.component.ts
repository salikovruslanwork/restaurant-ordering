import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

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
import { ORDER_ACTIONS } from '@admin/config/orders.config';
import type { OrderRow, OrderStatusChange } from '@admin/models/admin-orders.model';

@Component({
  selector: 'app-order-admin-card',
  imports: [
    ButtonComponent,
    MoneyComponent,
    OrderActionsComponent,
    OrderLinesComponent,
    StatusChipComponent,
    TimeAgoPipe
  ],
  templateUrl: './order-admin-card.component.html',
  styleUrl: './order-admin-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderAdminCardComponent {
  readonly row = input.required<OrderRow>();
  readonly expanded = input(false, { transform: booleanAttribute });
  readonly now = input.required<number>();
  readonly readOnly = input(false, { transform: booleanAttribute });

  readonly toggled = output();
  readonly statusChanged = output<OrderStatusChange>();

  protected readonly ButtonSize = ButtonSize;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly hasActions = computed(() => ORDER_ACTIONS[this.row().order.status].length > 0);
}
