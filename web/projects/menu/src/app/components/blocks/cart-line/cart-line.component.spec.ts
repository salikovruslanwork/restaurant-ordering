import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { CartChangeKind } from '@restaurant/contracts';
import type { CartLineView } from '@menu/models/cart.model';
import { makeLineView } from '@menu/testing/cart';

import { CartLineComponent } from './cart-line.component';

describe('CartLineComponent', () => {
  let fixture: ComponentFixture<CartLineComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const text = (selector: string) =>
    element().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  async function render(overrides: Partial<CartLineView> = {}): Promise<void> {
    fixture = TestBed.createComponent(CartLineComponent);
    fixture.componentRef.setInput('line', makeLineView(overrides));
    await fixture.whenStable();
  }

  it('shows the name, unit price, total and a stepper', async () => {
    await render();

    expect(text('.cart-line__name')).toBe('Miso');
    expect(text('.cart-line__meta')).toBe('$4.50 each');
    expect(text('.cart-line__total')).toBe('$9.00');
    expect(element().querySelector('app-quantity-stepper')).not.toBeNull();
    expect(element().querySelector('.cart-line__warning')).toBeNull();
  });

  it('marks a price the customer set', async () => {
    await render({ isCustomPrice: true });

    expect(text('.cart-line__meta')).toBe('Your price · $4.50 each');
  });

  it('warns about a changed price', async () => {
    await render({ issue: CartChangeKind.PriceChanged, seenPrice: 450, unitPrice: 600 });

    expect(text('.cart-line__warning--price span')).toBe('Price changed: $4.50 → $6.00');
  });

  it.each([
    [CartChangeKind.Unavailable, 'No longer available — remove to continue'],
    [CartChangeKind.Removed, 'Removed from the menu — remove to continue']
  ])('blocks a line that is %s', async (issue, message) => {
    await render({ issue, isBlocked: true });

    expect(element().querySelector('.cart-line--blocked')).not.toBeNull();
    expect(text('.cart-line__warning--error')).toContain(message);
    expect(element().querySelector('app-quantity-stepper')).toBeNull();
    expect(text('button[aria-label="Remove Miso"]')).toContain('Remove');
  });

  it('emits quantity changes and removal', async () => {
    await render();
    const quantities: number[] = [];
    let removed = 0;
    fixture.componentInstance.quantityChanged.subscribe((quantity) => quantities.push(quantity));
    fixture.componentInstance.removed.subscribe(() => removed++);

    element().querySelector<HTMLButtonElement>('button[aria-label="Increase Miso"]')?.click();
    element()
      .querySelector<HTMLButtonElement>('app-button button[aria-label="Remove Miso"]')
      ?.click();

    expect(quantities).toEqual([3]);
    expect(removed).toBe(1);
  });
});
