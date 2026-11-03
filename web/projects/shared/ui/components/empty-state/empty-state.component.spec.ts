import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

@Component({
  imports: [EmptyStateComponent],
  template: `<app-empty-state heading="No orders" icon="receipt_long">
    <button type="button">Browse</button>
  </app-empty-state>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class HostComponent {}

describe('EmptyStateComponent', () => {
  it('renders the icon, heading, text and projected action', async () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('icon', 'receipt_long');
    fixture.componentRef.setInput('heading', 'No orders');
    fixture.componentRef.setInput('text', 'Orders show up here.');
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.empty-state__icon')?.textContent?.trim()).toBe('receipt_long');
    expect(element.querySelector('.empty-state__title')?.textContent).toBe('No orders');
    expect(element.querySelector('.empty-state__text')?.textContent).toBe('Orders show up here.');
  });

  it('projects an action and leaves out missing text', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.empty-state button')?.textContent).toBe('Browse');
    expect(element.querySelector('.empty-state__text')).toBeNull();
  });
});
