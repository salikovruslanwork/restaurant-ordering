import { TestBed } from '@angular/core/testing';

import { EMPTY_SUMMARY } from '@menu/testing/cart';

import { CartBarComponent } from './cart-bar.component';

describe('CartBarComponent', () => {
  it('shows the count and total, flags blocked lines, and opens the cart', async () => {
    const fixture = TestBed.createComponent(CartBarComponent);
    fixture.componentRef.setInput('summary', {
      ...EMPTY_SUMMARY,
      count: 3,
      total: 1350,
      hasBlockedLines: true
    });
    let opened = 0;
    fixture.componentInstance.opened.subscribe(() => opened++);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.getAttribute('aria-label')).toBe('View cart, 3 items, total $13.50');
    expect(button.querySelector('.cart-bar__count')?.textContent).toBe('3');
    expect(button.querySelector('.cart-bar__total')?.textContent).toBe('$13.50');
    expect(button.querySelector('.icon')?.textContent).toBe('error');

    button.click();
    expect(opened).toBe(1);
  });
});
