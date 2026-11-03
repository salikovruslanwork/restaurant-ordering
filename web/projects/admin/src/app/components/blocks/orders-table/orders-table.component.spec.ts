import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { OrderStatus } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import type { OrderRow, OrderStatusChange } from '@admin/models/admin-orders.model';

import { OrdersTableComponent } from './orders-table.component';

const rows: OrderRow[] = [
  { order: makeOrder(), summary: '2× Miso', isSaving: false, isFresh: true },
  {
    order: makeOrder({ id: 'o2', number: 1002, status: OrderStatus.Ready }),
    summary: '2× Miso',
    isSaving: true,
    isFresh: false
  }
];

describe('OrdersTableComponent', () => {
  let fixture: ComponentFixture<OrdersTableComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const row = (index: number) =>
    element().querySelectorAll<HTMLElement>('.orders-table__row--order')[index];

  async function render(expanded: string[] = []): Promise<void> {
    fixture = TestBed.createComponent(OrdersTableComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('expandedIds', new Set(expanded));
    fixture.componentRef.setInput('now', Date.parse('2026-11-02T12:05:00.000Z'));
    await fixture.whenStable();
  }

  it('shows each order with number, time, items, total and status', async () => {
    await render();

    expect(
      [...element().querySelectorAll('[role="columnheader"]')].map((cell) =>
        cell.textContent?.trim()
      )
    ).toEqual(['Details', 'Order', 'Time', 'Items', 'Total', 'Status', 'Actions']);
    expect(row(0)?.textContent).toContain('#1001');
    expect(row(0)?.textContent).toContain('5 min ago');
    expect(row(0)?.querySelector('.orders-table__items')?.getAttribute('title')).toBe('2× Miso');
    expect(row(0)?.querySelector('.money')?.textContent).toContain('$9.00');
    expect(row(0)?.querySelector('.status-chip--placed')).not.toBeNull();
  });

  it('highlights fresh orders and shows saving', async () => {
    await render();

    expect(row(0)?.classList).toContain('orders-table__row--fresh');
    expect(row(1)?.classList).not.toContain('orders-table__row--fresh');
    expect(row(1)?.querySelector('.saving-indicator')).not.toBeNull();
  });

  it('expands the details of an order', async () => {
    await render(['o2']);
    const toggled: string[] = [];
    fixture.componentInstance.toggled.subscribe((id) => toggled.push(id));

    expect(element().querySelectorAll('app-order-lines')).toHaveLength(1);
    expect(
      element().querySelector('button[aria-label="Details of order #1002"] .icon')?.textContent
    ).toBe('expand_less');
    expect(
      element()
        .querySelector('button[aria-label="Details of order #1002"]')
        ?.getAttribute('aria-expanded')
    ).toBe('true');
    expect(
      element()
        .querySelector('button[aria-label="Details of order #1001"]')
        ?.getAttribute('aria-expanded')
    ).toBe('false');

    element()
      .querySelector<HTMLButtonElement>('button[aria-label="Details of order #1001"]')
      ?.click();
    expect(toggled).toEqual(['o1']);
  });

  it('passes status changes on with the order', async () => {
    await render();
    const changes: OrderStatusChange[] = [];
    fixture.componentInstance.statusChanged.subscribe((change) => changes.push(change));

    element()
      .querySelector<HTMLButtonElement>('button[aria-label="Start preparing, order #1001"]')
      ?.click();

    expect(changes).toEqual([{ order: rows[0]!.order, target: OrderStatus.Preparing }]);
  });
});
