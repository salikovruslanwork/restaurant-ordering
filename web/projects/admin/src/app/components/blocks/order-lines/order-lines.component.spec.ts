import { TestBed } from '@angular/core/testing';

import { makeOrder } from '@shared/data-access/testing/orders';

import { OrderLinesComponent } from './order-lines.component';

describe('OrderLinesComponent', () => {
  async function render(order = makeOrder()): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(OrderLinesComponent);
    fixture.componentRef.setInput('order', order);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const text = (element: Element | null | undefined) =>
    [...(element?.children ?? [])]
      .map((child) => child.textContent?.replace(/\s+/g, ' ').trim())
      .join(' ');

  it('lists the lines with quantities and totals', async () => {
    const element = await render();

    expect(text(element.querySelector('.order-lines__row'))).toBe('2× Miso $9.00');
    expect([...element.querySelectorAll('.order-lines__sum')].map((row) => text(row))).toEqual([
      'Subtotal $9.00',
      'Total $9.00'
    ]);
    expect(element.querySelector('.order-lines__meta')?.textContent).toMatch(
      /^Placed at \d{1,2}:\d{2}/
    );
  });

  it('can sit inset on the page surface', async () => {
    const element = await render();
    expect(element.querySelector('.order-lines--inset')).toBeNull();

    const fixture = TestBed.createComponent(OrderLinesComponent);
    fixture.componentRef.setInput('order', makeOrder());
    fixture.componentRef.setInput('inset', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.order-lines--inset')).not.toBeNull();
  });

  it('tags customer prices and shows a discount', async () => {
    const order = makeOrder();
    const element = await render({
      ...order,
      lines: [{ ...order.lines[0]!, isOpenPrice: true }],
      discount: 200,
      total: 700
    });

    expect(element.querySelector('.order-lines__tag')?.textContent).toBe('customer price');
    expect([...element.querySelectorAll('.order-lines__sum')].map((row) => text(row))).toEqual([
      'Subtotal $9.00',
      'Discount −$2.00',
      'Total $7.00'
    ]);
  });
});
