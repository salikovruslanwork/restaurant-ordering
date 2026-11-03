import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ERROR_STATE_RETRY_LABEL, ERROR_STATE_TITLE } from '../../config/error-state.config';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-error-state',
  imports: [ButtonComponent, IconComponent],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorStateComponent {
  readonly heading = input(ERROR_STATE_TITLE);
  readonly text = input.required<string>();
  readonly retryLabel = input(ERROR_STATE_RETRY_LABEL);
  readonly retry = output();
}
