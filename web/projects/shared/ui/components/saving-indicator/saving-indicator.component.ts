import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-saving-indicator',
  imports: [SpinnerComponent],
  templateUrl: './saving-indicator.component.html',
  styleUrl: './saving-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavingIndicatorComponent {}
