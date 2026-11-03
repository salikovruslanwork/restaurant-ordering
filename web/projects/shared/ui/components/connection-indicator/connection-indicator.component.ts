import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

import type { ConnectionStatus } from '@shared/data-access';

import { CONNECTION_LABELS } from '../../config/connection-indicator.config';

@Component({
  selector: 'app-connection-indicator',
  templateUrl: './connection-indicator.component.html',
  styleUrl: './connection-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionIndicatorComponent {
  readonly status = input.required<ConnectionStatus>();
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly label = computed(() => CONNECTION_LABELS[this.status()]);
}
