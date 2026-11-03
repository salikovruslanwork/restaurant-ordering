import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

import { OrderStatus, type Order } from '@restaurant/contracts';
import { MoneyPipe, PluralizePipe, StatusChipComponent, TimeAgoPipe } from '@shared/ui';
import { clockTime, countOrderItems, summarizeOrder } from '@shared/util';
import { OrderProgressComponent } from '@menu/components/blocks/order-progress/order-progress.component';

@Component({
  selector: 'app-order-card',
  imports: [MoneyPipe, OrderProgressComponent, PluralizePipe, StatusChipComponent, TimeAgoPipe],
  templateUrl: './order-card.component.html',
  styleUrl: './order-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderCardComponent {
  readonly order = input.required<Order>();
  readonly now = input.required<number>();
  readonly fresh = input(false, { transform: booleanAttribute });

  protected readonly summary = computed(() => summarizeOrder(this.order()));
  protected readonly itemCount = computed(() => countOrderItems(this.order()));
  protected readonly clock = computed(() => clockTime(this.order().createdAt));
  protected readonly isCancelled = computed(() => this.order().status === OrderStatus.Cancelled);
}
