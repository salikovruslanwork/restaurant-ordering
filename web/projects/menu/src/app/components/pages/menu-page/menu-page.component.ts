import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkVirtualScrollableElement } from '@angular/cdk/scrolling';

import { filter, from, switchMap, take } from 'rxjs';

import { Store } from '@ngrx/store';

import type { Category, Id, MenuItem } from '@restaurant/contracts';
import { getPageContent, menuActions, menuFeature, PageContent } from '@shared/data-access';
import {
  DialogService,
  EmptyStateComponent,
  ErrorStateComponent,
  LayoutService,
  PluralizePipe
} from '@shared/ui';
import { CartBarComponent } from '@menu/components/blocks/cart-bar/cart-bar.component';
import { CartPanelComponent } from '@menu/components/blocks/cart-panel/cart-panel.component';
import { CategoryBarComponent } from '@menu/components/blocks/category-bar/category-bar.component';
import { MenuGridComponent } from '@menu/components/blocks/menu-grid/menu-grid.component';
import { MenuSkeletonComponent } from '@menu/components/blocks/menu-skeleton/menu-skeleton.component';
import { MENU_LOAD_ERROR, MENU_TITLE_ALL } from '@menu/config/menu.config';
import { getVisibleItems } from '@menu/helpers/menu-grid';
import type { MenuItemQuantity, OpenPriceChoice } from '@menu/models/cart.model';
import { cartActions } from '@menu/store/cart/cart.actions';
import { cartFeature } from '@menu/store/cart/cart.reducer';

@Component({
  selector: 'app-menu-page',
  imports: [
    CartBarComponent,
    CartPanelComponent,
    CategoryBarComponent,
    CdkVirtualScrollableElement,
    EmptyStateComponent,
    ErrorStateComponent,
    MenuGridComponent,
    MenuSkeletonComponent,
    PluralizePipe
  ],
  templateUrl: './menu-page.component.html',
  styleUrl: './menu-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuPageComponent {
  private readonly store = inject(Store);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollable = viewChild(CdkVirtualScrollableElement);

  protected readonly PageContent = PageContent;
  protected readonly loadError = MENU_LOAD_ERROR;

  protected readonly categories = this.store.selectSignal(menuFeature.selectCategoriesWithItems);
  private readonly allCategories = this.store.selectSignal(menuFeature.selectAllCategories);
  private readonly itemsByCategory = this.store.selectSignal(menuFeature.selectItemsByCategory);
  private readonly loadStatus = this.store.selectSignal(menuFeature.selectLoadStatus);
  protected readonly quantities = this.store.selectSignal(cartFeature.selectQuantities);
  protected readonly cartSummary = this.store.selectSignal(cartFeature.selectSummary);

  protected readonly isMobile = inject(LayoutService).isMobile;
  // A category that runs out of dishes disappears from the bar, so the page falls back to All.
  protected readonly selectedId = linkedSignal<Category[], Id | null>({
    source: this.categories,
    computation: (categories, previous) =>
      categories.some(({ id }) => id === previous?.value) ? (previous?.value ?? null) : null
  });

  protected readonly content = computed(() =>
    getPageContent(this.loadStatus(), this.allCategories().length > 0)
  );
  protected readonly items = computed(() =>
    getVisibleItems(this.allCategories(), this.itemsByCategory(), this.selectedId())
  );
  protected readonly title = computed(() => this.getTitle(this.categories(), this.selectedId()));

  protected select(id: Id | null): void {
    this.selectedId.set(id);
    this.scrollable()?.scrollTo({ top: 0 });
  }

  protected add(item: MenuItem): void {
    this.store.dispatch(cartActions.itemAdded({ item }));
  }

  protected changeQuantity({ item, quantity }: MenuItemQuantity): void {
    this.store.dispatch(cartActions.quantityChanged({ key: item.id, quantity }));
  }

  protected askPrice(item: MenuItem): void {
    from(import('@menu/components/dialogs/open-price-dialog/open-price-dialog.component'))
      .pipe(
        switchMap(
          ({ OpenPriceDialogComponent }) =>
            this.dialog.open<OpenPriceChoice>(OpenPriceDialogComponent, { data: { item } }).closed$
        ),
        take(1),
        filter((choice) => choice !== undefined),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ price, quantity }) =>
        this.store.dispatch(cartActions.openPriceItemAdded({ item, price, quantity }))
      );
  }

  protected openCart(): void {
    this.store.dispatch(cartActions.openRequested());
  }

  protected retry(): void {
    this.store.dispatch(menuActions.load());
  }

  private getTitle(categories: Category[], id: Id | null): string {
    return categories.find((category) => category.id === id)?.name ?? MENU_TITLE_ALL;
  }
}
