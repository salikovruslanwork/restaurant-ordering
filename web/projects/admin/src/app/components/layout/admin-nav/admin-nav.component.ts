import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { IconComponent } from '@shared/ui';
import type { AdminNavItem, AdminRoute } from '@admin/models/admin-nav.model';

@Component({
  selector: 'app-admin-nav',
  imports: [IconComponent, RouterLink, RouterLinkActive],
  templateUrl: './admin-nav.component.html',
  styleUrl: './admin-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminNavComponent {
  readonly items = input.required<AdminNavItem[]>();
  readonly badges = input<Partial<Record<AdminRoute, number>>>({});
}
