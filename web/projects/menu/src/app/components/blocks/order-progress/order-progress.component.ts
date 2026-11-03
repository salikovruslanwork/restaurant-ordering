import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

import { OrderStatus, type Order } from '@restaurant/contracts';
import { IconComponent, STATUS_CHIP } from '@shared/ui';
import { ORDER_PROGRESS_STEPS } from '@menu/config/my-orders.config';
import { progressIndex, progressText, toProgressSteps } from '@menu/helpers/my-orders';

@Component({
  selector: 'app-order-progress',
  imports: [IconComponent],
  templateUrl: './order-progress.component.html',
  styleUrl: './order-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderProgressComponent {
  readonly order = input.required<Order>();
  readonly fresh = input(false, { transform: booleanAttribute });

  private readonly index = computed(() => progressIndex(this.order()));
  protected readonly steps = computed(() => toProgressSteps(this.index(), STATUS_CHIP));
  protected readonly text = computed(() => progressText(this.order(), this.index(), STATUS_CHIP));
  protected readonly fill = computed(
    () => (this.index() / (ORDER_PROGRESS_STEPS.length - 1)) * 100
  );
  protected readonly isCancelled = computed(() => this.order().status === OrderStatus.Cancelled);
}
