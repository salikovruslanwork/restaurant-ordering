import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-form-error',
  imports: [IconComponent],
  templateUrl: './form-error.component.html',
  styleUrl: './form-error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormErrorComponent {
  readonly message = input.required<string>();
}
