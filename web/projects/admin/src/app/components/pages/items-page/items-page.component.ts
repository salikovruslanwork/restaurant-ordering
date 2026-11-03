import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport
} from '@angular/cdk/scrolling';

import { Store } from '@ngrx/store';

import type { Id } from '@restaurant/contracts';
import { getPageContent, menuActions, menuFeature, PageContent } from '@shared/data-access';
import {
  ButtonComponent,
  ButtonVariant,
  DialogService,
  DialogSize,
  EmptyStateComponent,
  ErrorStateComponent,
  LayoutService,
  PluralizePipe,
  SkeletonComponent,
  SkeletonVariant
} from '@shared/ui';
import { ItemAdminCardComponent } from '@admin/components/blocks/item-admin-card/item-admin-card.component';
import { ItemsTableComponent } from '@admin/components/blocks/items-table/items-table.component';
import { ItemsToolbarComponent } from '@admin/components/blocks/items-toolbar/items-toolbar.component';
import { ItemEditDialogComponent } from '@admin/components/dialogs/item-edit-dialog/item-edit-dialog.component';
import { ADMIN_PAGE } from '@admin/components/layout/admin-page/admin-page.component';
import {
  ITEM_CARD_ROW_HEIGHT,
  ITEM_SKELETON_ROWS,
  ITEMS_LOAD_ERROR
} from '@admin/config/items.config';
import { itemDeleteDialog } from '@admin/helpers/item-dialogs';
import type { ItemEditDialogData } from '@admin/models/item-edit-dialog.model';
import type { ItemAvailabilityChange, ItemRow } from '@admin/models/item-list.model';
import type { AvailabilityFilter } from '@admin/models/menu-editor.model';
import { selectIsReadOnly } from '@admin/store/connection/connection.selectors';
import { menuEditorActions } from '@admin/store/menu-editor/menu-editor.actions';
import { menuEditorFeature } from '@admin/store/menu-editor/menu-editor.reducer';
import {
  selectActiveItemFilter,
  selectItemList
} from '@admin/store/menu-editor/menu-editor.selectors';

@Component({
  selector: 'app-items-page',
  imports: [
    ...ADMIN_PAGE,
    ButtonComponent,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    EmptyStateComponent,
    ErrorStateComponent,
    ItemAdminCardComponent,
    ItemsTableComponent,
    ItemsToolbarComponent,
    PluralizePipe,
    SkeletonComponent
  ],
  templateUrl: './items-page.component.html',
  styleUrl: './items-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemsPageComponent {
  private readonly store = inject(Store);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly PageContent = PageContent;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly SkeletonVariant = SkeletonVariant;
  protected readonly loadError = ITEMS_LOAD_ERROR;
  protected readonly cardHeight = ITEM_CARD_ROW_HEIGHT;
  protected readonly skeletonRows = Array.from({ length: ITEM_SKELETON_ROWS }, (_, i) => i);

  protected readonly list = this.store.selectSignal(selectItemList);
  protected readonly filter = this.store.selectSignal(selectActiveItemFilter);
  protected readonly categories = this.store.selectSignal(menuFeature.selectAllCategories);
  protected readonly isReadOnly = this.store.selectSignal(selectIsReadOnly);
  protected readonly freshIds = this.store.selectSignal(menuEditorFeature.selectFreshIdSet);
  private readonly loadStatus = this.store.selectSignal(menuFeature.selectLoadStatus);
  private readonly items = this.store.selectSignal(menuFeature.selectItemEntities);

  protected readonly isMobile = inject(LayoutService).isMobile;
  protected readonly content = computed(() =>
    getPageContent(this.loadStatus(), this.categories().length > 0)
  );
  protected readonly isFiltered = computed(() => this.list().rows.length !== this.list().total);

  protected retry(): void {
    this.store.dispatch(menuActions.load());
  }

  protected filterByCategory(categoryId: Id | null): void {
    this.store.dispatch(menuEditorActions.filterItemsByCategory({ categoryId }));
  }

  protected filterByAvailability(availability: AvailabilityFilter): void {
    this.store.dispatch(menuEditorActions.filterItemsByAvailability({ availability }));
  }

  protected clearFilters(): void {
    this.store.dispatch(menuEditorActions.clearItemFilters());
  }

  protected changeAvailability({ id, isAvailable }: ItemAvailabilityChange): void {
    this.store.dispatch(menuEditorActions.changeItemAvailability({ id, isAvailable }));
  }

  protected openEditor(id: Id | null): void {
    const data: ItemEditDialogData = {
      item: id ? (this.items()[id] ?? null) : null,
      categoryId: this.filter().categoryId
    };
    this.store.dispatch(menuEditorActions.startItemEdit({ id }));
    this.dialog.open(ItemEditDialogComponent, { data, size: DialogSize.Form, disableClose: true });
  }

  protected requestDelete({ id, name }: ItemRow): void {
    this.dialog
      .confirm(itemDeleteDialog(name))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.dispatch(menuEditorActions.deleteItem({ id, name })));
  }

  protected trackById(_index: number, row: ItemRow): Id {
    return row.id;
  }
}
