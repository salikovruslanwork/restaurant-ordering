import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { CartDiscountComponent } from './cart-discount.component';

describe('CartDiscountComponent', () => {
  let fixture: ComponentFixture<CartDiscountComponent>;
  let applied: number[];
  let removed: number;
  const element = (): HTMLElement => fixture.nativeElement;

  async function render(discount = 0, effective = discount, subtotal = 2000): Promise<void> {
    fixture = TestBed.createComponent(CartDiscountComponent);
    fixture.componentRef.setInput('discount', discount);
    fixture.componentRef.setInput('applied', effective);
    fixture.componentRef.setInput('subtotal', subtotal);
    applied = [];
    removed = 0;
    fixture.componentInstance.discountApplied.subscribe((value) => applied.push(value));
    fixture.componentInstance.discountRemoved.subscribe(() => removed++);
    await fixture.whenStable();
  }

  async function enter(value: string): Promise<void> {
    const input = element().querySelector<HTMLInputElement>('input');
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    element()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  it('applies a valid amount in cents', async () => {
    await render();

    await enter('5.50');

    expect(applied).toEqual([550]);
  });

  it.each([
    ['', 'Enter a discount amount'],
    ['x', 'Enter an amount like 5 or 5.50'],
    ['1,0222', 'Enter an amount like 5 or 5.50'],
    ['0', 'The discount must be more than $0'],
    ['20.01', 'Discount can’t exceed the subtotal ($20.00)']
  ])('rejects “%s”', async (value, message) => {
    await render();

    await enter(value);

    expect(applied).toEqual([]);
    expect(element().querySelector('.text-field__error')?.textContent).toContain(message);
  });

  it('shows an applied discount as a chip that can be removed', async () => {
    await render(500);

    expect(element().querySelector('.cart-discount__chip')?.textContent).toContain('−$5.00');
    expect(element().querySelector('form')).toBeNull();
    element().querySelector<HTMLButtonElement>('button[aria-label="Remove discount"]')?.click();
    expect(removed).toBe(1);
  });

  it('says when the discount was reduced to the subtotal', async () => {
    await render(5000, 2000);

    expect(element().querySelector('.cart-discount__note')?.textContent).toContain(
      'Reduced to $20.00'
    );
  });
});
