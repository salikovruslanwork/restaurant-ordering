import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import type { Order } from '@restaurant/contracts';
import { MoneyPipe } from '@shared/ui';

@Component({
  selector: 'app-order-lines',
  imports: [DatePipe, MoneyPipe],
  templateUrl: './order-lines.component.html',
  styleUrl: './order-lines.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderLinesComponent {
  readonly order = input.required<Order>();
  readonly inset = input(false, { transform: booleanAttribute });
}
