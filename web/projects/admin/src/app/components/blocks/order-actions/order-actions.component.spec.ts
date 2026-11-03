import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { OrderStatus } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';
import type { OrderAction } from '@admin/models/admin-orders.model';

import { OrderActionsComponent } from './order-actions.component';

describe('OrderActionsComponent', () => {
  let fixture: ComponentFixture<OrderActionsComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const buttons = () => [...element().querySelectorAll('button')];

  async function render(inputs: Record<string, unknown> = {}): Promise<void> {
    fixture = TestBed.createComponent(OrderActionsComponent);
    fixture.componentRef.setInput('order', makeOrder());
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
  }

  it('offers cancel first, then the next step, with labels naming the order', async () => {
    await render();

    expect(buttons().map((button) => button.textContent?.trim())).toEqual([
      'Cancel',
      'Start preparing'
    ]);
    expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Cancel order #1001',
      'Start preparing, order #1001'
    ]);
    expect(buttons()[0]?.classList).toContain('button--text-danger');
  });

  it.each([
    [OrderStatus.Placed, ['Cancel', 'Start preparing']],
    [OrderStatus.Preparing, ['Mark ready']]
  ])('offers the right steps for %s', async (status, labels) => {
    await render({ order: makeOrder({ status }) });

    expect(buttons().map((button) => button.textContent?.trim())).toEqual(labels);
  });

  it.each([OrderStatus.Ready, OrderStatus.Cancelled])(
    'says nothing is left to do for %s',
    async (status) => {
      await render({ order: makeOrder({ status }) });

      expect(element().querySelector('.order-actions__none')?.textContent).toBe('No actions');
    }
  );

  it('shows saving instead of the buttons', async () => {
    await render({ saving: true });

    expect(element().querySelector('.saving-indicator')).not.toBeNull();
    expect(buttons()).toEqual([]);
  });

  it('emits the chosen action, and turns off while read-only', async () => {
    await render();
    const chosen: OrderAction[] = [];
    fixture.componentInstance.selected.subscribe((action) => chosen.push(action));

    buttons()[1]?.click();
    expect(chosen.map(({ target }) => target)).toEqual([OrderStatus.Preparing]);

    fixture.componentRef.setInput('readOnly', true);
    await fixture.whenStable();
    expect(buttons().every((button) => button.disabled)).toBe(true);
  });

  it('stretches the buttons in block mode', async () => {
    await render({ block: true });

    expect(element().querySelector('.order-actions--block')).not.toBeNull();
  });
});
