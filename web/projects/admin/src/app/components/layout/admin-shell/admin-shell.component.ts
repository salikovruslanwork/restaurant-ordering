import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CdkVirtualScrollableElement } from '@angular/cdk/scrolling';
import { RouterOutlet } from '@angular/router';

import { Store } from '@ngrx/store';

import { connectionFeature } from '@shared/data-access';
import { ConnectionBannerComponent, HeaderComponent } from '@shared/ui';
import { AdminNavComponent } from '@admin/components/layout/admin-nav/admin-nav.component';
import { ADMIN_NAV_ITEMS } from '@admin/config/admin-nav.config';
import { AdminRoute } from '@admin/models/admin-nav.model';
import { adminOrdersFeature } from '@admin/store/admin-orders/admin-orders.reducer';

@Component({
  selector: 'app-admin-shell',
  imports: [
    AdminNavComponent,
    CdkVirtualScrollableElement,
    ConnectionBannerComponent,
    HeaderComponent,
    RouterOutlet
  ],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminShellComponent {
  private readonly store = inject(Store);

  protected readonly connectionStatus = this.store.selectSignal(connectionFeature.selectStatus);
  protected readonly navItems = ADMIN_NAV_ITEMS;
  private readonly placedCount = this.store.selectSignal(adminOrdersFeature.selectPlacedCount);
  protected readonly navBadges = computed(() => ({ [AdminRoute.Orders]: this.placedCount() }));
}
