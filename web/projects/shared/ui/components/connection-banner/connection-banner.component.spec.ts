import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { ConnectionStatus } from '@shared/data-access';

import { BACK_ONLINE_DURATION_MS } from '../../config/connection-banner.config';
import { ConnectionBannerComponent } from './connection-banner.component';

const { Live, Reconnecting, Offline } = ConnectionStatus;

describe('ConnectionBannerComponent', () => {
  let fixture: ComponentFixture<ConnectionBannerComponent>;

  const banner = () => (fixture.nativeElement as HTMLElement).querySelector('.connection-banner');

  async function setStatus(status: ConnectionStatus): Promise<void> {
    fixture.componentRef.setInput('status', status);
    // Zoneless change detection runs on a timer, which fake timers hold back.
    await vi.advanceTimersByTimeAsync(0);
    await fixture.whenStable();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(ConnectionBannerComponent);
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('stays hidden while the first connection opens', async () => {
    await setStatus(Reconnecting);
    expect(banner()).toBeNull();

    await setStatus(Live);
    expect(banner()).toBeNull();
  });

  it('is in a polite live region, so changes get announced', async () => {
    await setStatus(Live);

    const region: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('shows reconnecting after a live connection drops', async () => {
    await setStatus(Live);

    await setStatus(Reconnecting);

    expect(banner()?.classList).toContain('connection-banner--reconnecting');
    expect(banner()?.textContent).toContain('Reconnecting…');
  });

  it('shows offline, even before the first connection', async () => {
    await setStatus(Offline);

    expect(banner()?.classList).toContain('connection-banner--offline');
  });

  it('shows "Back online" briefly after recovery', async () => {
    await setStatus(Live);
    await setStatus(Reconnecting);

    await setStatus(Live);
    expect(banner()?.classList).toContain('connection-banner--online');
    expect(banner()?.textContent).toContain('Back online');

    await vi.advanceTimersByTimeAsync(BACK_ONLINE_DURATION_MS - 1);
    await fixture.whenStable();
    expect(banner()).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    // Change detection queued from inside a fake-timer tick lands on the next timer.
    await vi.advanceTimersToNextTimerAsync();
    await fixture.whenStable();
    expect(banner()).toBeNull();
  });

  it('shows "Back online" after starting offline', async () => {
    await setStatus(Offline);

    await setStatus(Live);

    expect(banner()?.classList).toContain('connection-banner--online');
  });

  it('does not let an old timer hide a new problem', async () => {
    await setStatus(Live);
    await setStatus(Reconnecting);
    await setStatus(Live);

    await setStatus(Reconnecting);
    await vi.advanceTimersByTimeAsync(BACK_ONLINE_DURATION_MS);
    await fixture.whenStable();

    expect(banner()?.classList).toContain('connection-banner--reconnecting');
  });

  it('accepts messages that explain the situation, for the admin app', async () => {
    fixture.componentRef.setInput('offlineMessage', 'You’re offline — read-only');
    fixture.componentRef.setInput('reconnectingMessage', 'Reconnecting — read-only');

    await setStatus(Offline);
    expect(banner()?.textContent).toContain('You’re offline — read-only');

    await setStatus(Live);
    await setStatus(Reconnecting);
    expect(banner()?.textContent).toContain('Reconnecting — read-only');
  });
});
