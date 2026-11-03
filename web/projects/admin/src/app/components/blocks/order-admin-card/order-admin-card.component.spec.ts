import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { OrderStatus } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import type { OrderRow, OrderStatusChange } from '@admin/models/admin-orders.model';

import { OrderAdminCardComponent } from './order-admin-card.component';

const row: OrderRow = { order: makeOrder(), summary: '2× Miso', isSaving: false, isFresh: true };

describe('OrderAdminCardComponent', () => {
  let fixture: ComponentFixture<OrderAdminCardComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const toggle = () =>
    [...element().querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('etails')
    );

  async function render(expanded = false, cardRow = row): Promise<void> {
    fixture = TestBed.createComponent(OrderAdminCardComponent);
    fixture.componentRef.setInput('row', cardRow);
    fixture.componentRef.setInput('expanded', expanded);
    fixture.componentRef.setInput('now', Date.parse('2026-11-02T12:00:10.000Z'));
    await fixture.whenStable();
  }

  it('shows the number, time, status, items and total', async () => {
    await render();

    expect(element().querySelector('h2')?.textContent).toBe('#1001');
    expect(element().querySelector('.order-admin-card__time')?.textContent).toBe('Just now');
    expect(element().querySelector('.status-chip--placed')).not.toBeNull();
    expect(element().querySelector('.order-admin-card__items')?.textContent).toBe('2× Miso');
    expect(element().querySelector('.order-admin-card--fresh')).not.toBeNull();
    expect(element().querySelector('.order-actions--block')).not.toBeNull();
  });

  it('leaves the actions out when the order has none, unless it is saving', async () => {
    const ready = { ...row, order: makeOrder({ status: OrderStatus.Ready }) };
    await render(false, ready);
    expect(element().querySelector('app-order-actions')).toBeNull();

    await render(false, { ...ready, isSaving: true });
    expect(element().querySelector('app-order-actions')).not.toBeNull();
  });

  it('toggles the details', async () => {
    await render();
    let toggled = 0;
    fixture.componentInstance.toggled.subscribe(() => toggled++);
    expect(toggle()?.textContent?.trim()).toContain('Details');
    expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
    expect(element().querySelector('app-order-lines')).toBeNull();

    toggle()?.click();
    expect(toggled).toBe(1);

    await render(true);
    expect(toggle()?.textContent?.trim()).toContain('Hide details');
    expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
    expect(element().querySelector('app-order-lines .order-lines--inset')).not.toBeNull();
  });

  it('passes status changes on', async () => {
    await render();
    const changes: OrderStatusChange[] = [];
    fixture.componentInstance.statusChanged.subscribe((change) => changes.push(change));

    element().querySelector<HTMLButtonElement>('button[aria-label="Cancel order #1001"]')?.click();

    expect(changes).toEqual([{ order: row.order, target: OrderStatus.Cancelled }]);
  });
});
