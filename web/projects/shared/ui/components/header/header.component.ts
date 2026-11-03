import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import type { ConnectionStatus } from '@shared/data-access';

import { HEADER_LOGO_ICON } from '../../config/header.config';
import { HeaderActionsDirective } from '../../slots/header.slots';
import { ConnectionIndicatorComponent } from '../connection-indicator/connection-indicator.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-header',
  imports: [ConnectionIndicatorComponent, IconComponent, NgTemplateOutlet],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  readonly name = input.required<string>();
  readonly connectionStatus = input.required<ConnectionStatus>();
  readonly tagline = input<string | null>(null);
  readonly badge = input<string | null>(null);
  readonly brandLabel = input<string | null>(null);
  readonly slim = input(false, { transform: booleanAttribute });
  readonly brandClicked = output();

  protected readonly logoIcon = HEADER_LOGO_ICON;
}

export const HEADER = [HeaderComponent, HeaderActionsDirective] as const;
