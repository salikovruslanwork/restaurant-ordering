import { TestBed } from '@angular/core/testing';

import { ConnectionStatus } from '@shared/data-access';

import { ConnectionIndicatorComponent } from './connection-indicator.component';

describe('ConnectionIndicatorComponent', () => {
  async function render(status: ConnectionStatus, compact = false): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(ConnectionIndicatorComponent);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('compact', compact);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it.each([
    [ConnectionStatus.Live, 'Live'],
    [ConnectionStatus.Reconnecting, 'Reconnecting'],
    [ConnectionStatus.Offline, 'Offline']
  ])('shows %s as a dot with a visible label', async (status, label) => {
    const element = await render(status);

    expect(element.querySelector(`.connection-indicator--${status}`)?.textContent).toContain(label);
    expect(element.querySelector('.connection-indicator__hidden-label')).toBeNull();
    expect(element.querySelector('[title]')).toBeNull();
  });

  it('keeps the label for screen readers when compact', async () => {
    const element = await render(ConnectionStatus.Offline, true);

    expect(element.querySelector('.connection-indicator--compact')?.getAttribute('title')).toBe(
      'Connection: Offline'
    );
    expect(element.querySelector('.connection-indicator__hidden-label')?.textContent).toBe(
      'Connection: Offline'
    );
  });
});
