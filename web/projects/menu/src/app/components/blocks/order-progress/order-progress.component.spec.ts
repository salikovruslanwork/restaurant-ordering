import { TestBed } from '@angular/core/testing';

import { OrderStatus, type Order } from '@restaurant/contracts';
import { makeOrder } from '@shared/data-access/testing/orders';

import { OrderProgressComponent } from './order-progress.component';

describe('OrderProgressComponent', () => {
  async function render(order: Order, fresh = false): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(OrderProgressComponent);
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('fresh', fresh);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const classes = (element: HTMLElement) =>
    [...element.querySelectorAll('.order-progress__step')].map((step) =>
      step.classList.contains('order-progress__step--current')
        ? 'current'
        : step.classList.contains('order-progress__step--done')
          ? 'done'
          : '-'
    );

  it('shows the steps up to the current status with a filled track', async () => {
    const element = await render(makeOrder({ status: OrderStatus.Preparing, version: 2 }));

    expect(element.querySelector('.order-progress__text')?.textContent).toBe(
      'Step 2 of 3: Preparing'
    );
    expect(classes(element)).toEqual(['done', 'current', '-']);
    expect(element.querySelector<HTMLElement>('.order-progress__fill')?.style.width).toBe('50%');
    expect(element.querySelectorAll('.order-progress__dot app-icon')).toHaveLength(1);
    expect(element.querySelector('.order-progress__pip')).not.toBeNull();
    expect(element.querySelector('.order-progress--cancelled')).toBeNull();
  });

  it('checks every step of a ready order', async () => {
    const element = await render(makeOrder({ status: OrderStatus.Ready, version: 3 }));

    expect(element.querySelectorAll('.order-progress__dot app-icon')).toHaveLength(3);
    expect(element.querySelector<HTMLElement>('.order-progress__fill')?.style.width).toBe('100%');
  });

  it('greys out a cancelled order at the first step', async () => {
    const element = await render(makeOrder({ status: OrderStatus.Cancelled, version: 2 }));

    expect(element.querySelector('.order-progress--cancelled')).not.toBeNull();
    expect(element.querySelector('.order-progress__text')?.textContent).toBe(
      'Cancelled after “Placed”'
    );
    expect(classes(element)).toEqual(['current', '-', '-']);
  });

  it('pops the current step of a freshly changed order', async () => {
    const element = await render(makeOrder({ status: OrderStatus.Preparing, version: 2 }), true);

    expect(
      element.querySelectorAll('.order-progress__step--entered.order-progress__step--current')
    ).toHaveLength(1);
  });
});
