import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { DEFAULT_ICON_SIZE, ICON_FONT_SET } from '../../config/icon.config';

@Component({
  selector: 'app-icon',
  imports: [MatIcon],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(DEFAULT_ICON_SIZE);
  readonly filled = input(false, { transform: booleanAttribute });

  protected readonly fontSet = ICON_FONT_SET;
}
