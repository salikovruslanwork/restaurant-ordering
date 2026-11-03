import { TestBed } from '@angular/core/testing';

import { MoneyVariant } from '../../models/money.model';
import { MoneyComponent } from './money.component';

describe('MoneyComponent', () => {
  async function render(inputs: Record<string, unknown>): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(MoneyComponent);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('formats the amount', async () => {
    const element = await render({ amount: 1250 });

    expect(element.querySelector('.money__new')?.textContent).toBe('$12.50');
    expect(element.querySelector('.money--changed')).toBeNull();
    expect(element.querySelector('.money__old')).toBeNull();
  });

  it('treats a missing amount as zero', async () => {
    expect((await render({})).textContent).toContain('$0.00');
  });

  it.each([1100, 0])('shows the old price %i struck through', async (previousAmount) => {
    const element = await render({ amount: 1250, previousAmount });

    expect(element.querySelector('.money--changed')).not.toBeNull();
    expect(element.querySelector('s.money__old')?.textContent).toMatch(/^was \$/);
    expect(element.querySelector('.money__new')?.textContent?.trim()).toBe('now $12.50');
  });

  it('can be small', async () => {
    expect(
      (await render({ amount: 1, small: true })).querySelector('.money--small')
    ).not.toBeNull();
  });

  it.each([
    [MoneyVariant.Open, 'Set your price', '.money--open'],
    [MoneyVariant.OpenChip, 'Open price', '.money--open-chip']
  ])('renders the %s variant', async (variant, text, selector) => {
    const element = await render({ variant });

    expect(element.querySelector(selector)?.textContent).toBe(text);
  });
});
