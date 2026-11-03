import { TestBed } from '@angular/core/testing';

import { OrderStatus } from '@restaurant/contracts';

import { StatusChipComponent } from './status-chip.component';

describe('StatusChipComponent', () => {
  it.each([
    [OrderStatus.Placed, 'Placed', 'receipt'],
    [OrderStatus.Preparing, 'Preparing', 'skillet'],
    [OrderStatus.Ready, 'Ready', 'room_service'],
    [OrderStatus.Cancelled, 'Cancelled', 'cancel']
  ])('shows %s with a label and an icon, not colour alone', async (status, label, icon) => {
    const fixture = TestBed.createComponent(StatusChipComponent);
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();

    const chip: HTMLElement = fixture.nativeElement.querySelector(`.status-chip--${status}`);
    expect(chip.textContent).toContain(label);
    expect(chip.querySelector('app-icon')?.textContent?.trim()).toBe(icon);
  });
});
