import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { PricingKind, type MenuItem } from '@restaurant/contracts';
import { PRICE_CHANGE_HOLD_MS } from '@menu/config/menu.config';
import { makeItem } from '@menu/testing/menu';

import { MenuItemComponent } from './menu-item.component';

describe('MenuItemComponent', () => {
  let fixture: ComponentFixture<MenuItemComponent>;
  const element = (): HTMLElement => fixture.nativeElement;

  async function render(item: MenuItem = makeItem(), inputs: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent(MenuItemComponent);
    fixture.componentRef.setInput('item', item);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
  }

  async function update(item: MenuItem): Promise<void> {
    fixture.componentRef.setInput('item', item);
    await fixture.whenStable();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the image, name, description and price', async () => {
    await render();

    expect(element().querySelector('h2')?.textContent).toBe('Miso');
    expect(element().querySelector('h2')?.getAttribute('title')).toBe('Miso');
    expect(element().querySelector('.menu-item__description')?.textContent).toBe('Warm broth');
    expect(element().querySelector('.money')?.textContent).toBe('$4.50');
    expect(element().querySelector('.dish-image__label')?.textContent).toBe('Miso');
    expect(element().querySelector('.menu-item__badge')).toBeNull();
  });

  it('asks the customer to set the price of an open-price dish', async () => {
    await render(makeItem({ pricing: { kind: PricingKind.Open } }));

    expect(element().querySelector('.money--open')?.textContent).toBe('Set your price');
  });

  it('marks an unavailable dish', async () => {
    await render(makeItem({ isAvailable: false }));

    expect(element().querySelector('.menu-item--unavailable')).not.toBeNull();
    expect(element().querySelector('.menu-item__badge')?.textContent).toBe('Unavailable');
    expect(element().querySelector('.dish-image--muted')).not.toBeNull();
  });

  it('shows a live price change for a while, then only the new price', async () => {
    await render();
    vi.useFakeTimers();

    fixture.componentRef.setInput(
      'item',
      makeItem({ pricing: { kind: PricingKind.Fixed, price: 600 }, version: 2 })
    );
    // Zoneless change detection runs on a timer, which fake timers hold back.
    await vi.advanceTimersByTimeAsync(0);
    await fixture.whenStable();
    expect(element().querySelector('.money--changed')).not.toBeNull();
    expect(element().querySelector('.money__old')?.textContent).toBe('was $4.50');
    expect(element().querySelector('.money__new')?.textContent).toBe('now $6.00');

    await vi.advanceTimersByTimeAsync(PRICE_CHANGE_HOLD_MS);
    // Change detection queued from inside a fake-timer tick lands on the next timer.
    await vi.advanceTimersToNextTimerAsync();
    await fixture.whenStable();
    expect(element().querySelector('.money--changed')).toBeNull();
    expect(element().querySelector('.money__new')?.textContent).toBe('$6.00');
  });

  it('doesn’t count a different dish in the same place as a price change', async () => {
    await render();

    await update(makeItem({ id: 'ramen', pricing: { kind: PricingKind.Fixed, price: 900 } }));

    expect(element().querySelector('.money--changed')).toBeNull();
  });

  it('ignores changes that aren’t price changes', async () => {
    await render();

    await update(makeItem({ isAvailable: false, version: 2 }));
    await update(makeItem({ pricing: { kind: PricingKind.Open }, version: 3 }));

    expect(element().querySelector('.money--changed')).toBeNull();
  });

  describe('adding to the cart', () => {
    const button = (label: string) =>
      element().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

    it('adds a fixed-price dish', async () => {
      await render();
      let added = 0;
      fixture.componentInstance.added.subscribe(() => added++);

      button('Add Miso')?.click();

      expect(added).toBe(1);
    });

    it('shows a stepper once the dish is in the cart', async () => {
      await render(makeItem(), { quantity: 2 });
      const quantities: number[] = [];
      fixture.componentInstance.quantityChanged.subscribe((quantity) => quantities.push(quantity));

      expect(button('Add Miso')).toBeNull();
      expect(element().querySelector('.quantity-stepper__value')?.textContent).toBe('2');
      button('Decrease Miso')?.click();
      expect(quantities).toEqual([1]);
    });

    it('asks for the price of an open-price dish, even when it is in the cart', async () => {
      await render(makeItem({ pricing: { kind: PricingKind.Open } }), { quantity: 2 });
      let asked = 0;
      fixture.componentInstance.openPriceRequested.subscribe(() => asked++);

      button('Add Miso — set your price')?.click();

      expect(asked).toBe(1);
      expect(element().querySelector('app-quantity-stepper')).toBeNull();
    });

    it('can’t add an unavailable dish', async () => {
      await render(makeItem({ isAvailable: false }), { quantity: 2 });

      expect(button('Add Miso — unavailable')?.disabled).toBe(true);
      expect(element().querySelector('app-quantity-stepper')).toBeNull();
    });
  });
});
