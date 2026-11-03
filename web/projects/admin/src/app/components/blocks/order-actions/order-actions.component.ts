import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

import type { Order } from '@restaurant/contracts';
import { ButtonComponent, ButtonSize, ButtonVariant, SavingIndicatorComponent } from '@shared/ui';
import { ORDER_ACTIONS } from '@admin/config/orders.config';
import type { OrderAction } from '@admin/models/admin-orders.model';

@Component({
  selector: 'app-order-actions',
  imports: [ButtonComponent, SavingIndicatorComponent],
  templateUrl: './order-actions.component.html',
  styleUrl: './order-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderActionsComponent {
  readonly order = input.required<Order>();
  readonly saving = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly block = input(false, { transform: booleanAttribute });

  readonly selected = output<OrderAction>();

  protected readonly ButtonSize = ButtonSize;
  protected readonly ButtonVariant = ButtonVariant;
  // The cancel action sits before the main one, as in the mockup.
  protected readonly actions = computed(() => [...ORDER_ACTIONS[this.order().status]].reverse());
}
