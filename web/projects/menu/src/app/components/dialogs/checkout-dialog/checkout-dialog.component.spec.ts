import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { Subject } from 'rxjs';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { CartChangeKind } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import { DialogRef } from '@shared/ui';
import {
  CheckoutBlock,
  CheckoutErrorKind,
  CheckoutStep,
  type CheckoutChange
} from '@menu/models/checkout.model';
import { checkoutActions } from '@menu/store/checkout/checkout.actions';
import { checkoutFeature } from '@menu/store/checkout/checkout.reducer';
import { cartSelectors, EMPTY_SUMMARY, makeLineView } from '@menu/testing/cart';

import { CheckoutDialogComponent } from './checkout-dialog.component';

describe('CheckoutDialogComponent', () => {
  let fixture: ComponentFixture<CheckoutDialogComponent>;
  let store: MockStore;
  let close: ReturnType<typeof vi.fn>;
  let closed$: Subject<boolean | undefined>;
  const element = (): HTMLElement => fixture.nativeElement;
  const title = () => element().querySelector('.dialog__title')?.textContent?.trim();
  const button = (text: string) =>
    [...element().querySelectorAll<HTMLButtonElement>('.dialog__actions button')].find(
      (candidate) => candidate.textContent?.includes(text)
    );

  async function render(
    state: {
      step?: CheckoutStep;
      changes?: CheckoutChange[];
      errorKind?: CheckoutErrorKind | null;
      block?: CheckoutBlock | null;
      empty?: boolean;
    } = {}
  ): Promise<void> {
    close = vi.fn();
    closed$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [
            ...cartSelectors({
              lines: state.empty ? [] : [makeLineView({ isCustomPrice: true })],
              summary: { ...EMPTY_SUMMARY, count: 2, subtotal: 900, discount: 100, total: 800 },
              block: state.block ?? null
            }),
            { selector: checkoutFeature.selectStep, value: state.step ?? CheckoutStep.Review },
            { selector: checkoutFeature.selectChanges, value: state.changes ?? [] },
            {
              selector: checkoutFeature.selectOrder,
              value: makeOrder({ number: 1042, discount: 100, total: 800 })
            },
            { selector: checkoutFeature.selectErrorKind, value: state.errorKind ?? null }
          ]
        }),
        { provide: DialogRef, useValue: { close, closed$ } }
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(CheckoutDialogComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    store.resetSelectors();
  });

  it('reviews the order and places it', async () => {
    await render();

    expect(title()).toBe('Review your order');
    const cells = [...(element().querySelector('.checkout-dialog__line')?.children ?? [])].map(
      (cell) => cell.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(cells).toEqual(['2×', 'Miso · Your price', '$9.00']);
    expect(element().querySelector('app-cart-summary')).not.toBeNull();
    button('Place order · $8.00')?.click();
    expect(store.dispatch).toHaveBeenCalledWith(checkoutActions.placeOrder());
  });

  it('can’t place while blocked, and says why', async () => {
    await render({ block: CheckoutBlock.BlockedLines });

    expect(button('Place order')?.disabled).toBe(true);
    expect(element().querySelector('.checkout-dialog__hint')?.textContent).toContain(
      'Remove unavailable items'
    );
  });

  it('shows placing and can’t be closed meanwhile', async () => {
    await render({ step: CheckoutStep.Submitting });

    expect(button('Placing order…')?.getAttribute('aria-busy')).toBe('true');
    expect(button('Back to cart')?.disabled).toBe(true);
    element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(close).not.toHaveBeenCalled();
  });

  it('lists what changed and asks to confirm the updated order', async () => {
    await render({
      step: CheckoutStep.Conflict,
      changes: [
        { kind: CartChangeKind.PriceChanged, name: 'Miso', oldAmount: 450, newAmount: 500 },
        { kind: CartChangeKind.Unavailable, name: 'Tea', oldAmount: null, newAmount: null },
        { kind: CartChangeKind.Removed, name: 'Cake', oldAmount: null, newAmount: null },
        { kind: CartChangeKind.DiscountTooHigh, name: null, oldAmount: 500, newAmount: 300 }
      ]
    });

    expect(title()).toBe('Some items changed');
    expect(element().querySelector('.dialog__hero--warning')).not.toBeNull();
    expect(
      [...element().querySelectorAll('.checkout-dialog__change span')].map((change) =>
        change.textContent?.replace(/\s+/g, ' ').trim()
      )
    ).toEqual([
      'Miso: price changed $4.50 → $5.00',
      'Tea is no longer available — removed from your order',
      'Cake was taken off the menu — removed from your order',
      'Discount reduced from $5.00 to $3.00 — it can’t be more than the subtotal'
    ]);
    button('Confirm updated order')?.click();
    expect(store.dispatch).toHaveBeenCalledWith(checkoutActions.placeOrder());
  });

  it('says when nothing is left after the changes', async () => {
    await render({ step: CheckoutStep.Conflict, empty: true, block: CheckoutBlock.Empty });

    expect(element().textContent).toContain('Nothing is left in your order');
    expect(button('Confirm updated order')?.disabled).toBe(true);
  });

  it('confirms a placed order and closes with success', async () => {
    await render({ step: CheckoutStep.Success });

    expect(title()).toBe('Order #1042 placed');
    expect(element().querySelector('.dialog__hero--success')).not.toBeNull();
    expect(
      element().querySelector('.checkout-dialog__receipt')?.textContent?.replace(/\s+/g, ' ').trim()
    ).toBe('2 items · $1.00 off $8.00');
    button('Back to menu')?.click();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('tracks a placed order on the My orders page', async () => {
    await render({ step: CheckoutStep.Success });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    button('Track order')?.click();

    expect(close).toHaveBeenCalledWith(true);
    expect(navigate).toHaveBeenCalledWith('/orders');
  });

  it.each([
    [CheckoutErrorKind.Connection, 'cloud_off', 'the connection dropped'],
    [CheckoutErrorKind.Server, 'error', 'Something went wrong on our side']
  ])('explains a %s error and offers to try again', async (errorKind, icon, text) => {
    await render({ step: CheckoutStep.Error, errorKind });

    expect(title()).toBe('We couldn’t place your order');
    expect(element().querySelector('.dialog__hero')?.textContent?.trim()).toBe(icon);
    expect(element().querySelector('.checkout-dialog__lead')?.textContent).toContain(text);
    button('Try again')?.click();
    expect(store.dispatch).toHaveBeenCalledWith(checkoutActions.placeOrder());
  });

  it('closes back to the cart with Escape or the button, and resets checkout when closed', async () => {
    await render();

    element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    button('Back to cart')?.click();
    expect(close.mock.calls).toEqual([[false], [false]]);

    closed$.next(false);
    expect(store.dispatch).toHaveBeenCalledWith(checkoutActions.closed());
  });
});
