import { TestBed } from '@angular/core/testing';

import { SavingIndicatorComponent } from './saving-indicator.component';

describe('SavingIndicatorComponent', () => {
  it('announces saving with a spinner', async () => {
    const fixture = TestBed.createComponent(SavingIndicatorComponent);
    await fixture.whenStable();

    const indicator: HTMLElement = fixture.nativeElement.querySelector('.saving-indicator');
    expect(indicator.getAttribute('role')).toBe('status');
    expect(indicator.textContent).toContain('Saving…');
    expect(indicator.querySelector('app-spinner')).not.toBeNull();
  });
});
