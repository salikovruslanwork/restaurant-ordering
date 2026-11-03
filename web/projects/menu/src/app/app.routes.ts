import { Routes } from '@angular/router';

import { MenuShellComponent } from './components/layout/menu-shell/menu-shell.component';
import { MENU_ROUTES } from './routes/menu.routes';

export const routes: Routes = [
  {
    path: '',
    component: MenuShellComponent,
    children: [
      { path: '', children: MENU_ROUTES },
      { path: '**', redirectTo: '' }
    ]
  }
];
