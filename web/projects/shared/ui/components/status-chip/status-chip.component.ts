import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { OrderStatus } from '@restaurant/contracts';

import { STATUS_CHIP } from '../../config/status-chip.config';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-status-chip',
  imports: [IconComponent],
  templateUrl: './status-chip.component.html',
  styleUrl: './status-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusChipComponent {
  readonly status = input.required<OrderStatus>();

  protected readonly chip = computed(() => STATUS_CHIP[this.status()]);
}
