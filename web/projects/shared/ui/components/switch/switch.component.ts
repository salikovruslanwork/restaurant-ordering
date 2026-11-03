import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-switch',
  imports: [MatSlideToggle],
  templateUrl: './switch.component.html',
  styleUrl: './switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SwitchComponent {
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input.required<string>();
  readonly changed = output<boolean>();
}
