import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { PricingKind } from '@restaurant/contracts';
import { DIALOG_DATA, DialogRef } from '@shared/ui';
import { makeItem } from '@menu/testing/menu';

import { OpenPriceDialogComponent } from './open-price-dialog.component';

const cake = makeItem({ id: 'cake', name: 'Cake', pricing: { kind: PricingKind.Open } });

describe('OpenPriceDialogComponent', () => {
  let fixture: ComponentFixture<OpenPriceDialogComponent>;
  let close: ReturnType<typeof vi.fn>;
  const element = (): HTMLElement => fixture.nativeElement;
  const input = () => element().querySelector<HTMLInputElement>('input');
  const submitButton = () => element().querySelector<HTMLButtonElement>('button[type="submit"]');

  async function type(value: string): Promise<void> {
    const field = input();
    if (field) {
      field.value = value;
      field.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { item: cake } },
        { provide: DialogRef, useValue: { close } }
      ]
    });
    fixture = TestBed.createComponent(OpenPriceDialogComponent);
    await fixture.whenStable();
  });

  it('shows the dish, a note and the price field, focused', () => {
    expect(element().querySelector('.dialog__title')?.textContent?.trim()).toBe('Set your price');
    expect(element().querySelector('.open-price-dialog__name')?.textContent).toBe('Cake');
    expect(element().querySelector('.open-price-dialog__note')?.textContent).toContain(
      'no fixed price'
    );
    expect(element().querySelector('.text-field__help')?.textContent).toBe(
      'From $0.01 up to $10,000'
    );
    expect(document.activeElement).toBe(input());
  });

  it.each([
    ['', 'Enter the amount you’d like to pay'],
    ['abc', 'Enter an amount like 25 or 25.50'],
    ['0', 'The amount must be more than $0'],
    ['10000.01', 'The amount can’t be more than $10,000']
  ])('rejects “%s”', async (value, message) => {
    await type(value);
    await submit();

    expect(element().querySelector('.text-field__error')?.textContent).toContain(message);
    expect(close).not.toHaveBeenCalled();
  });

  it('shows the total on the button and returns the price and quantity', async () => {
    await type('12.5');
    element().querySelector<HTMLButtonElement>('button[aria-label="Increase Cake"]')?.click();
    await fixture.whenStable();

    expect(submitButton()?.textContent?.trim()).toBe('Add to cart · $25.00');
    await submit();
    expect(close).toHaveBeenCalledWith({ price: 1250, quantity: 2 });
  });

  it('keeps the quantity at 1 or more', () => {
    expect(
      element().querySelector<HTMLButtonElement>('button[aria-label="Decrease Cake"]')?.disabled
    ).toBe(true);
  });

  it('closes without a result on cancel', () => {
    [...element().querySelectorAll<HTMLButtonElement>('.dialog__actions button')]
      .find((button) => button.textContent?.trim() === 'Cancel')
      ?.click();

    expect(close).toHaveBeenCalledWith();
  });
});
