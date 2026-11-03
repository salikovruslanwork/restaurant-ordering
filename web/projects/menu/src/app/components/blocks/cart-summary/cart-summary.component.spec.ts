import { TestBed } from '@angular/core/testing';

import { EMPTY_SUMMARY } from '@menu/testing/cart';

import { CartSummaryComponent } from './cart-summary.component';

describe('CartSummaryComponent', () => {
  async function rows(discount: number): Promise<string[]> {
    const fixture = TestBed.createComponent(CartSummaryComponent);
    fixture.componentRef.setInput('summary', {
      ...EMPTY_SUMMARY,
      subtotal: 2000,
      discount,
      total: 2000 - discount
    });
    await fixture.whenStable();
    return [...fixture.nativeElement.querySelectorAll('.cart-summary__row')].map((row: Element) =>
      [...row.children].map((cell) => cell.textContent?.trim()).join(' ')
    );
  }

  it('shows the subtotal and total', async () => {
    expect(await rows(0)).toEqual(['Subtotal $20.00', 'Total $20.00']);
  });

  it('adds a discount row when there is one', async () => {
    expect(await rows(500)).toEqual(['Subtotal $20.00', 'Discount −$5.00', 'Total $15.00']);
  });
});
