import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

import type { ActionMenuItem } from '../../models/action-menu.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-action-menu',
  imports: [IconComponent, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger],
  templateUrl: './action-menu.component.html',
  styleUrl: './action-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActionMenuComponent {
  readonly items = input.required<readonly ActionMenuItem[]>();
  readonly ariaLabel = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly selected = output<ActionMenuItem>();
}
