import { Routes } from '@angular/router';

import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { ADMIN_TITLE_SUFFIX } from '@admin/config/admin-nav.config';
import { AdminRoute } from '@admin/models/admin-nav.model';
import { MenuEditorCategoriesEffects } from '@admin/store/menu-editor/menu-editor-categories.effects';
import { MenuEditorItemsEffects } from '@admin/store/menu-editor/menu-editor-items.effects';
import { MenuEditorUiEffects } from '@admin/store/menu-editor/menu-editor-ui.effects';
import { menuEditorFeature } from '@admin/store/menu-editor/menu-editor.reducer';

export const MENU_EDITOR_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(menuEditorFeature),
      provideEffects(MenuEditorCategoriesEffects, MenuEditorItemsEffects, MenuEditorUiEffects)
    ],
    children: [
      {
        path: AdminRoute.Items,
        title: `Items · ${ADMIN_TITLE_SUFFIX}`,
        loadComponent: () =>
          import('@admin/components/pages/items-page/items-page.component').then(
            (m) => m.ItemsPageComponent
          )
      },
      {
        path: AdminRoute.Categories,
        title: `Categories · ${ADMIN_TITLE_SUFFIX}`,
        loadComponent: () =>
          import('@admin/components/pages/categories-page/categories-page.component').then(
            (m) => m.CategoriesPageComponent
          )
      }
    ]
  }
];
