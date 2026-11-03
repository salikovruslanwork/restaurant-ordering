import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Store } from '@ngrx/store';

import { connectionFeature } from '@shared/data-access';
import { ButtonComponent, ButtonVariant, HEADER, IconComponent, PluralizePipe } from '@shared/ui';
import { MENU_TAGLINE } from '@menu/config/menu.config';
import { MY_ORDERS_URL } from '@menu/config/my-orders.config';
import { cartActions } from '@menu/store/cart/cart.actions';
import { cartFeature } from '@menu/store/cart/cart.reducer';

@Component({
  selector: 'app-menu-shell',
  imports: [
    ...HEADER,
    ButtonComponent,
    IconComponent,
    PluralizePipe,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './menu-shell.component.html',
  styleUrl: './menu-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuShellComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly ButtonVariant = ButtonVariant;
  protected readonly tagline = MENU_TAGLINE;
  protected readonly connectionStatus = this.store.selectSignal(connectionFeature.selectStatus);
  protected readonly cart = this.store.selectSignal(cartFeature.selectSummary);
  protected readonly ordersUrl = MY_ORDERS_URL;

  protected openCart(): void {
    this.store.dispatch(cartActions.openRequested());
  }

  protected goToMenu(): void {
    void this.router.navigateByUrl('/');
  }
}
