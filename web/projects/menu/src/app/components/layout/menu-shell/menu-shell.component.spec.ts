import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { connectionFeature, ConnectionStatus } from '@shared/data-access';
import { cartActions } from '@menu/store/cart/cart.actions';
import { cartSelectors, EMPTY_SUMMARY } from '@menu/testing/cart';

import { MenuShellComponent } from './menu-shell.component';

describe('MenuShellComponent', () => {
  let fixture: ComponentFixture<MenuShellComponent>;

  async function render(status: ConnectionStatus, count = 0): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'orders', children: [] }]),
        provideMockStore({
          selectors: [
            { selector: connectionFeature.selectStatus, value: status },
            ...cartSelectors({ summary: { ...EMPTY_SUMMARY, count } })
          ]
        })
      ]
    });
    fixture = TestBed.createComponent(MenuShellComponent);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  it('shows the header with the tagline, connection and cart button', async () => {
    const element = await render(ConnectionStatus.Live);

    expect(element.querySelector('.header__name')?.textContent).toBe('Tea House');
    expect(element.querySelector('.header__tagline')?.textContent).toBe(
      'Food from every corner, made fresh.'
    );
    expect(element.querySelector('.header__indicator')?.textContent).toContain('Live');
    expect(element.querySelector('button[aria-label="Cart, 0 items"]')).not.toBeNull();
    expect(element.querySelector('.menu-shell__badge')).toBeNull();
  });

  it('goes to the menu from the brand', async () => {
    const element = await render(ConnectionStatus.Live);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    element
      .querySelector<HTMLButtonElement>('button[aria-label="Tea House — go to menu"]')
      ?.click();

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('links to My orders and marks the link while that page is open', async () => {
    const element = await render(ConnectionStatus.Live);
    const router = TestBed.inject(Router);
    const link = element.querySelector<HTMLAnchorElement>('.menu-shell__orders');

    expect(link?.textContent?.trim()).toBe('receipt_longMy orders');
    expect(link?.getAttribute('aria-current')).toBeNull();

    await router.navigateByUrl('/orders');
    await fixture.whenStable();

    expect(link?.getAttribute('aria-current')).toBe('page');
    expect(link?.classList).toContain('menu-shell__orders--active');
  });

  it('points the header link at My orders', async () => {
    const element = await render(ConnectionStatus.Live);

    expect(element.querySelector('a.menu-shell__orders')?.getAttribute('href')).toBe('/orders');
  });

  it('keeps connection problems out of sight except the header dot, with the page in main', async () => {
    const element = await render(ConnectionStatus.Offline);

    expect(element.querySelector('app-connection-banner')).toBeNull();
    expect(element.querySelector('.header__indicator')?.textContent).toContain('Offline');
    expect(element.querySelector('main router-outlet')).not.toBeNull();
  });

  it('counts the cart items on the cart button and opens the cart', async () => {
    const element = await render(ConnectionStatus.Live, 3);
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    const button = element.querySelector<HTMLButtonElement>('.menu-shell__cart button');

    expect(element.querySelector('.menu-shell__badge')?.textContent).toBe('3');
    expect(button?.getAttribute('aria-label')).toBe('Cart, 3 items');

    button?.click();
    expect(dispatch).toHaveBeenCalledWith(cartActions.openRequested());
  });
});
