import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { SegmentedButtonOption } from '../../models/segmented-button.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-segmented-button',
  imports: [IconComponent],
  templateUrl: './segmented-button.component.html',
  styleUrl: './segmented-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SegmentedButtonComponent<T> {
  readonly options = input.required<readonly SegmentedButtonOption<T>[]>();
  readonly value = input.required<T>();
  readonly ariaLabel = input.required<string>();
  readonly changed = output<T>();

  protected select(value: T): void {
    if (value !== this.value()) {
      this.changed.emit(value);
    }
  }
}
