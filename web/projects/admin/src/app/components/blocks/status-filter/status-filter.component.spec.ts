import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { OrderStatus } from '@restaurant/contracts';

import { StatusFilterComponent } from './status-filter.component';

describe('StatusFilterComponent', () => {
  let fixture: ComponentFixture<StatusFilterComponent>;
  const chips = () => [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(StatusFilterComponent);
    fixture.componentRef.setInput('options', [
      { status: null, label: 'All', count: 3 },
      { status: OrderStatus.Placed, label: 'Placed', count: 2 }
    ]);
    fixture.componentRef.setInput('value', OrderStatus.Placed);
    await fixture.whenStable();
  });

  it('shows each status with its count and marks the active one', () => {
    expect(chips().map((chip) => chip.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All 3',
      'check Placed 2'
    ]);
    expect(chips().map((chip) => chip.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    expect(chips()[1]?.classList).toContain('status-filter__chip--active');
  });

  it('emits the chosen status', () => {
    const chosen: (OrderStatus | null)[] = [];
    fixture.componentInstance.changed.subscribe((status) => chosen.push(status));

    chips()[0]?.click();
    chips()[1]?.click();

    expect(chosen).toEqual([null, OrderStatus.Placed]);
  });
});
