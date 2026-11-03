import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { map, timer } from 'rxjs';

import { Store } from '@ngrx/store';

import { OrderStatus, type Id } from '@restaurant/contracts';
import { getPageContent, PageContent } from '@shared/data-access';
import {
  ButtonComponent,
  ButtonVariant,
  DialogService,
  EmptyStateComponent,
  ErrorStateComponent,
  LayoutService,
  PluralizePipe,
  SkeletonComponent,
  SkeletonVariant,
  STATUS_CHIP
} from '@shared/ui';
import { ORDER_CLOCK_REFRESH_MS } from '@shared/util';
import { OrderAdminCardComponent } from '@admin/components/blocks/order-admin-card/order-admin-card.component';
import { OrdersTableComponent } from '@admin/components/blocks/orders-table/orders-table.component';
import { StatusFilterComponent } from '@admin/components/blocks/status-filter/status-filter.component';
import { ADMIN_PAGE } from '@admin/components/layout/admin-page/admin-page.component';
import { ORDER_SKELETON_ROWS, ORDERS_LOAD_ERROR } from '@admin/config/orders.config';
import { orderCancelDialog } from '@admin/helpers/order-dialogs';
import type { OrderStatusChange } from '@admin/models/admin-orders.model';
import { adminOrdersActions } from '@admin/store/admin-orders/admin-orders.actions';
import { adminOrdersFeature } from '@admin/store/admin-orders/admin-orders.reducer';
import { selectIsReadOnly } from '@admin/store/connection/connection.selectors';

@Component({
  selector: 'app-orders-page',
  imports: [
    ...ADMIN_PAGE,
    ButtonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    OrderAdminCardComponent,
    OrdersTableComponent,
    PluralizePipe,
    SkeletonComponent,
    StatusFilterComponent
  ],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersPageComponent {
  private readonly store = inject(Store);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly PageContent = PageContent;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly SkeletonVariant = SkeletonVariant;
  protected readonly loadError = ORDERS_LOAD_ERROR;
  protected readonly skeletonRows = Array.from({ length: ORDER_SKELETON_ROWS }, (_, i) => i);

  protected readonly rows = this.store.selectSignal(adminOrdersFeature.selectOrderRows);
  protected readonly filterOptions = this.store.selectSignal(
    adminOrdersFeature.selectStatusFilterOptions
  );
  protected readonly statusFilter = this.store.selectSignal(adminOrdersFeature.selectStatusFilter);
  protected readonly placedCount = this.store.selectSignal(adminOrdersFeature.selectPlacedCount);
  protected readonly isReadOnly = this.store.selectSignal(selectIsReadOnly);
  private readonly loadStatus = this.store.selectSignal(adminOrdersFeature.selectLoadStatus);
  private readonly orderCount = computed(() => this.filterOptions()[0]?.count ?? 0);

  protected readonly isMobile = inject(LayoutService).isMobile;
  protected readonly now = toSignal(timer(0, ORDER_CLOCK_REFRESH_MS).pipe(map(() => Date.now())), {
    initialValue: Date.now()
  });
  protected readonly content = computed(() =>
    getPageContent(this.loadStatus(), this.orderCount() > 0)
  );
  protected readonly hasOrders = computed(() => this.orderCount() > 0);
  protected readonly filterLabel = computed(() => this.getFilterLabel(this.statusFilter()));
  protected readonly expandedIds = signal<ReadonlySet<Id>>(new Set());

  protected retry(): void {
    this.store.dispatch(adminOrdersActions.load());
  }

  protected filterBy(status: OrderStatus | null): void {
    this.store.dispatch(adminOrdersActions.filterByStatus({ status }));
  }

  protected toggle(id: Id): void {
    this.expandedIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  protected changeStatus({ order, target }: OrderStatusChange): void {
    if (target !== OrderStatus.Cancelled) {
      this.store.dispatch(adminOrdersActions.changeStatus({ order, target }));
      return;
    }
    this.dialog
      .confirm(orderCancelDialog(order.number))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.dispatch(adminOrdersActions.changeStatus({ order, target })));
  }

  private getFilterLabel(status: OrderStatus | null): string {
    return status ? STATUS_CHIP[status].label.toLowerCase() : '';
  }
}
