import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { QuantityStepperComponent } from './quantity-stepper.component';

describe('QuantityStepperComponent', () => {
  let fixture: ComponentFixture<QuantityStepperComponent>;
  let changes: number[];
  const element = (): HTMLElement => fixture.nativeElement;
  const buttons = () => [...element().querySelectorAll<HTMLButtonElement>('button')];

  async function render(value: number, min = 0): Promise<void> {
    fixture = TestBed.createComponent(QuantityStepperComponent);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('name', 'Miso');
    fixture.componentRef.setInput('min', min);
    changes = [];
    fixture.componentInstance.changed.subscribe((next) => changes.push(next));
    await fixture.whenStable();
  }

  it('shows the quantity in a labelled group', async () => {
    await render(3);

    expect(element().querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      'Quantity of Miso'
    );
    expect(element().querySelector('.quantity-stepper__value')?.textContent).toBe('3');
  });

  it('counts up and down', async () => {
    await render(3);

    buttons()[0]?.click();
    buttons()[1]?.click();

    expect(changes).toEqual([2, 4]);
    expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Decrease Miso',
      'Increase Miso'
    ]);
  });

  it('turns the last decrease into remove', async () => {
    await render(1);

    expect(buttons()[0]?.getAttribute('aria-label')).toBe('Remove Miso');
    buttons()[0]?.click();
    expect(changes).toEqual([0]);
  });

  it('stops at its minimum and at 99', async () => {
    await render(1, 1);
    expect(buttons()[0]?.disabled).toBe(true);
    expect(buttons()[0]?.getAttribute('aria-label')).toBe('Decrease Miso');

    await render(99);
    expect(buttons()[1]?.disabled).toBe(true);
  });

  it('can be small', async () => {
    await render(1);
    fixture.componentRef.setInput('small', true);
    await fixture.whenStable();

    expect(element().querySelector('.quantity-stepper--small')).not.toBeNull();
  });
});
