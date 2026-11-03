import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Store } from '@ngrx/store';

import type { Id } from '@restaurant/contracts';
import { getPageContent, menuActions, menuFeature, PageContent } from '@shared/data-access';
import { ButtonComponent, DialogService, ErrorStateComponent, PluralizePipe } from '@shared/ui';
import { CategoryListComponent } from '@admin/components/blocks/category-list/category-list.component';
import { ADMIN_PAGE } from '@admin/components/layout/admin-page/admin-page.component';
import { CATEGORIES_LOAD_ERROR } from '@admin/config/categories.config';
import {
  categoryBlockedDialog,
  categoryDeleteDialog,
  categoryNotEmptyMessage
} from '@admin/helpers/category-dialogs';
import type { CategoryMove, CategoryRow } from '@admin/models/category-list.model';
import { selectIsReadOnly } from '@admin/store/connection/connection.selectors';
import { menuEditorActions } from '@admin/store/menu-editor/menu-editor.actions';
import { menuEditorFeature } from '@admin/store/menu-editor/menu-editor.reducer';
import { selectCategoryRows } from '@admin/store/menu-editor/menu-editor.selectors';

@Component({
  selector: 'app-categories-page',
  imports: [
    ...ADMIN_PAGE,
    ButtonComponent,
    CategoryListComponent,
    ErrorStateComponent,
    PluralizePipe
  ],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesPageComponent {
  private readonly store = inject(Store);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly PageContent = PageContent;
  protected readonly loadError = CATEGORIES_LOAD_ERROR;
  protected readonly rows = this.store.selectSignal(selectCategoryRows);
  protected readonly edit = this.store.selectSignal(menuEditorFeature.selectCategoryEdit);
  protected readonly busyIds = this.store.selectSignal(menuEditorFeature.selectBusyCategoryIds);
  protected readonly freshIds = this.store.selectSignal(menuEditorFeature.selectFreshIdSet);
  protected readonly isReadOnly = this.store.selectSignal(selectIsReadOnly);
  private readonly loadStatus = this.store.selectSignal(menuFeature.selectLoadStatus);

  protected readonly content = computed(() =>
    getPageContent(this.loadStatus(), this.rows().length > 0)
  );
  protected readonly isCreating = computed(() => this.edit()?.id === null);

  protected retry(): void {
    this.store.dispatch(menuActions.load());
  }

  protected startCreate(): void {
    this.store.dispatch(menuEditorActions.startCategoryEdit({ id: null }));
  }

  protected startEdit(id: Id): void {
    this.store.dispatch(menuEditorActions.startCategoryEdit({ id }));
  }

  protected cancelEdit(): void {
    this.store.dispatch(menuEditorActions.cancelCategoryEdit());
  }

  protected save(name: string): void {
    const edit = this.edit();
    if (edit) {
      this.store.dispatch(menuEditorActions.saveCategory({ id: edit.id, name }));
    }
  }

  protected move({ id, direction }: CategoryMove): void {
    this.store.dispatch(menuEditorActions.moveCategory({ id, direction }));
  }

  protected requestDelete({ id, name, itemCount }: CategoryRow): void {
    if (itemCount > 0) {
      this.dialog.confirm(categoryBlockedDialog(categoryNotEmptyMessage(name, itemCount)));
      return;
    }
    this.dialog
      .confirm(categoryDeleteDialog(name))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.dispatch(menuEditorActions.deleteCategory({ id, name })));
  }
}
