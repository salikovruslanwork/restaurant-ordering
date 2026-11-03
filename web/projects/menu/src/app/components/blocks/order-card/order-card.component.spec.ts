import { TestBed } from '@angular/core/testing';

import { OrderStatus, type Order } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';

import { OrderCardComponent } from './order-card.component';

describe('OrderCardComponent', () => {
  const createdAt = new Date(2026, 10, 2, 14, 5).toISOString();
  const now = Date.parse(createdAt) + 5 * 60_000;

  async function render(order: Order, fresh = false): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(OrderCardComponent);
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('now', now);
    fixture.componentRef.setInput('fresh', fresh);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  it('shows the number, time, status, items, progress and total', async () => {
    const element = await render(makeOrder({ createdAt, status: OrderStatus.Preparing }));

    expect(text(element, '.order-card__number')).toBe('Order #1001');
    expect(element.querySelector('article')?.getAttribute('aria-labelledby')).toBe('order-1001');
    expect(element.querySelector('#order-1001')).not.toBeNull();
    expect(text(element, '.order-card__time')).toBe('5 min ago · 2:05 PM');
    expect(text(element, '.status-chip')).toContain('Preparing');
    expect(text(element, '.order-card__items')).toBe('2× Miso');
    expect(element.querySelector('app-order-progress')).not.toBeNull();
    expect(text(element, '.order-card__footer')).toBe('2 items $9.00');
  });

  it('mentions a discount in the footer', async () => {
    const element = await render(makeOrder({ createdAt, discount: 200, total: 700 }));

    expect(text(element, '.order-card__footer')).toBe('2 items · $2.00 discount $7.00');
  });

  it('marks cancelled and freshly changed orders', async () => {
    const cancelled = await render(makeOrder({ createdAt, status: OrderStatus.Cancelled }));
    expect(cancelled.querySelector('.order-card--cancelled')).not.toBeNull();
    expect(cancelled.querySelector('.order-card--fresh')).toBeNull();

    TestBed.resetTestingModule();
    const fresh = await render(makeOrder({ createdAt }), true);
    expect(fresh.querySelector('.order-card--fresh')).not.toBeNull();
    expect(fresh.querySelector('.order-progress__step--entered')).not.toBeNull();
  });
});
