import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { map, timer } from 'rxjs';

import { Store } from '@ngrx/store';

import {
  getPageContent,
  LoadStatus,
  menuActions,
  menuFeature,
  PageContent
} from '@shared/data-access';
import {
  ButtonComponent,
  ButtonVariant,
  EmptyStateComponent,
  ErrorStateComponent,
  SkeletonComponent,
  SkeletonVariant
} from '@shared/ui';
import { ORDER_CLOCK_REFRESH_MS } from '@shared/util';
import { OrderCardComponent } from '@menu/components/blocks/order-card/order-card.component';
import { MY_ORDERS_LOAD_ERROR, MY_ORDERS_SKELETON_CARDS } from '@menu/config/my-orders.config';
import { myOrdersActions } from '@menu/store/my-orders/my-orders.actions';
import { myOrdersFeature } from '@menu/store/my-orders/my-orders.reducer';

@Component({
  selector: 'app-my-orders-page',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    OrderCardComponent,
    SkeletonComponent
  ],
  templateUrl: './my-orders-page.component.html',
  styleUrl: './my-orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyOrdersPageComponent {
  private readonly store = inject(Store);

  protected readonly PageContent = PageContent;
  protected readonly SkeletonVariant = SkeletonVariant;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly loadError = MY_ORDERS_LOAD_ERROR;
  protected readonly skeletonCards = Array.from({ length: MY_ORDERS_SKELETON_CARDS }, (_, i) => i);

  protected readonly orders = this.store.selectSignal(myOrdersFeature.selectAllOrders);
  private readonly freshIds = this.store.selectSignal(myOrdersFeature.selectFreshIds);
  private readonly loadStatus = this.store.selectSignal(myOrdersFeature.selectLoadStatus);
  private readonly menuStatus = this.store.selectSignal(menuFeature.selectLoadStatus);

  protected readonly now = toSignal(timer(0, ORDER_CLOCK_REFRESH_MS).pipe(map(() => Date.now())), {
    initialValue: Date.now()
  });
  protected readonly content = computed(() =>
    getPageContent(this.loadStatus(), this.orders().length > 0)
  );
  protected readonly fresh = computed(() => new Set(this.freshIds()));

  // Orders load after the menu, so a failed menu has to be loaded again first.
  protected retry(): void {
    this.store.dispatch(
      this.menuStatus() === LoadStatus.Failed ? menuActions.load() : myOrdersActions.load()
    );
  }
}
