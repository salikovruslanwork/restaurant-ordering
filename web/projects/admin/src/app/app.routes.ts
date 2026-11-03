import { Routes } from '@angular/router';

import { AdminShellComponent } from './components/layout/admin-shell/admin-shell.component';
import { ADMIN_DEFAULT_ROUTE } from './config/admin-nav.config';

export const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: ADMIN_DEFAULT_ROUTE },
      {
        path: '',
        loadChildren: () => import('./routes/orders.routes').then((m) => m.ORDERS_ROUTES)
      },
      {
        path: '',
        loadChildren: () => import('./routes/menu-editor.routes').then((m) => m.MENU_EDITOR_ROUTES)
      },
      { path: '**', redirectTo: ADMIN_DEFAULT_ROUTE }
    ]
  }
];
