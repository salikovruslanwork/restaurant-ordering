import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { OrderStatus } from '@restaurant/contracts';
import { IconComponent } from '@shared/ui';
import type { StatusFilterOption } from '@admin/models/admin-orders.model';

@Component({
  selector: 'app-status-filter',
  imports: [IconComponent],
  templateUrl: './status-filter.component.html',
  styleUrl: './status-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusFilterComponent {
  readonly options = input.required<StatusFilterOption[]>();
  readonly value = input.required<OrderStatus | null>();

  readonly changed = output<OrderStatus | null>();
}
