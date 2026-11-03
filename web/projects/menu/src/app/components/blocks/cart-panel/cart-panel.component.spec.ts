import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { of, Subject } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { DialogRef, DialogService, DialogSize } from '@shared/ui';
import { CheckoutDialogComponent } from '@menu/components/dialogs/checkout-dialog/checkout-dialog.component';
import { CheckoutBlock } from '@menu/models/checkout.model';
import { cartActions } from '@menu/store/cart/cart.actions';
import { checkoutActions } from '@menu/store/checkout/checkout.actions';
import { cartSelectors, EMPTY_SUMMARY, makeLineView } from '@menu/testing/cart';

import { CartPanelComponent } from './cart-panel.component';

describe('CartPanelComponent', () => {
  let fixture: ComponentFixture<CartPanelComponent>;
  let store: MockStore;
  let actions$: Subject<Action>;
  let open: ReturnType<typeof vi.fn>;
  let placed: boolean;
  const element = (): HTMLElement => fixture.nativeElement;

  async function render(
    empty = false,
    close: (() => void) | null = null,
    block: CheckoutBlock | null = null
  ): Promise<void> {
    actions$ = new Subject<Action>();
    placed = false;
    open = vi.fn(() => ({ closed$: of(placed) }));
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        ...(close ? [{ provide: DialogRef, useValue: { close } }] : []),
        { provide: DialogService, useValue: { open } },
        provideMockStore({
          selectors: cartSelectors(
            empty
              ? {}
              : {
                  lines: [makeLineView()],
                  summary: { ...EMPTY_SUMMARY, count: 2, subtotal: 900, total: 900 },
                  block
                }
          )
        })
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(CartPanelComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    store.resetSelectors();
  });

  it('shows the lines, discount and summary with an item count', async () => {
    await render();

    expect(element().querySelector('h2')?.textContent).toBe('Your cart');
    expect(element().querySelector('.cart-panel__count')?.textContent).toBe('2 items');
    expect(element().querySelectorAll('app-cart-line')).toHaveLength(1);
    expect(element().querySelector('app-cart-discount form')).not.toBeNull();
    expect(element().querySelector('app-cart-summary')).not.toBeNull();
    expect(element().querySelector('button[aria-label="Close cart"]')).toBeNull();
  });

  it('turns line and discount events into actions', async () => {
    await render();

    element().querySelector<HTMLButtonElement>('button[aria-label="Increase Miso"]')?.click();
    element()
      .querySelector<HTMLButtonElement>('app-button button[aria-label="Remove Miso"]')
      ?.click();
    const input = element().querySelector<HTMLInputElement>('app-cart-discount input');
    if (input) {
      input.value = '2';
      input.dispatchEvent(new Event('input'));
    }
    element()
      .querySelector('app-cart-discount form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(vi.mocked(store.dispatch).mock.calls.map(([action]) => action)).toEqual([
      cartActions.quantityChanged({ key: 'miso', quantity: 3 }),
      cartActions.lineRemoved({ key: 'miso' }),
      cartActions.discountApplied({ discount: 200 })
    ]);
    expect(document.activeElement?.id).toBe('cart-title');
  });

  it('removes the discount', async () => {
    store?.resetSelectors();
    TestBed.resetTestingModule();
    actions$ = new Subject<Action>();
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: cartSelectors({
            lines: [makeLineView()],
            summary: { ...EMPTY_SUMMARY, count: 2, subtotal: 900, discount: 300, total: 600 },
            discount: 300
          })
        })
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(CartPanelComponent);
    await fixture.whenStable();

    element().querySelector<HTMLButtonElement>('button[aria-label="Remove discount"]')?.click();

    expect(store.dispatch).toHaveBeenCalledWith(cartActions.discountRemoved());
  });

  it('shows an empty state', async () => {
    await render(true);

    expect(element().querySelector('.empty-state__title')?.textContent).toBe('Your cart is empty');
    expect(element().querySelector('app-cart-summary')).toBeNull();
    expect(element().querySelector('.empty-state button')).toBeNull();
  });

  it('focuses its title when the cart is asked for', async () => {
    await render();

    actions$.next(cartActions.openRequested());

    expect(document.activeElement?.id).toBe('cart-title');
  });

  it('works as a sheet when opened through SheetService', async () => {
    const close = vi.fn();
    await render(true, close);

    expect(element().querySelector('.cart-panel--sheet')).not.toBeNull();
    expect(element().querySelector('.cart-panel__handle')).not.toBeNull();
    expect(element().querySelector('.empty-state button')?.textContent?.trim()).toBe(
      'Browse the menu'
    );
    element().querySelector<HTMLButtonElement>('button[aria-label="Close cart"]')?.click();
    element().querySelector<HTMLButtonElement>('.empty-state button')?.click();

    expect(close).toHaveBeenCalledTimes(2);
  });

  describe('checkout', () => {
    const checkoutButton = () =>
      [...element().querySelectorAll<HTMLButtonElement>('button')].find((button) =>
        button.textContent?.includes('Checkout')
      );

    it('opens the checkout dialog from the total', async () => {
      await render();

      expect(checkoutButton()?.textContent?.trim()).toBe('Checkout · $9.00');
      checkoutButton()?.click();
      await vi.dynamicImportSettled();

      expect(store.dispatch).toHaveBeenCalledWith(checkoutActions.opened());
      expect(open).toHaveBeenCalledWith(CheckoutDialogComponent, {
        size: DialogSize.Medium,
        disableClose: true
      });
    });

    it('is turned off with a reason when checkout is blocked', async () => {
      await render(false, null, CheckoutBlock.BlockedLines);

      expect(checkoutButton()?.disabled).toBe(true);
      expect(element().querySelector('.cart-panel__hint')?.textContent).toContain(
        'Remove unavailable items to continue'
      );
    });

    it('closes the sheet after a placed order, but not after going back', async () => {
      const close = vi.fn();
      store?.resetSelectors();
      TestBed.resetTestingModule();
      await render(false, close);

      checkoutButton()?.click();
      await vi.dynamicImportSettled();
      expect(close).not.toHaveBeenCalled();

      placed = true;
      checkoutButton()?.click();
      await vi.dynamicImportSettled();
      expect(close).toHaveBeenCalledOnce();
    });
  });
});
