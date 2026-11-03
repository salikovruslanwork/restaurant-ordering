import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { connectionFeature, ConnectionStatus } from '@shared/data-access';
import { ADMIN_NAV_ITEMS } from '@admin/config/admin-nav.config';
import { adminOrdersFeature } from '@admin/store/admin-orders/admin-orders.reducer';

import { AdminShellComponent } from './admin-shell.component';

describe('AdminShellComponent', () => {
  async function render(status: ConnectionStatus, placed = 0): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: connectionFeature.selectStatus, value: status },
            { selector: adminOrdersFeature.selectPlacedCount, value: placed }
          ]
        })
      ]
    });
    const fixture = TestBed.createComponent(AdminShellComponent);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  it('shows the admin header with the connection state', async () => {
    const element = await render(ConnectionStatus.Live);

    expect(element.querySelector('.header--slim')).not.toBeNull();
    expect(element.querySelector('.header__name')?.textContent).toBe('Tea House');
    expect(element.querySelector('.header__role')?.textContent).toBe('Admin');
    expect(element.querySelector('.header__indicator')?.textContent).toContain('Live');
  });

  it('shows the banner while offline', async () => {
    const element = await render(ConnectionStatus.Offline);

    expect(element.querySelector('.connection-banner--offline')).not.toBeNull();
  });

  it('renders the nav and a main region with the router outlet', async () => {
    const element = await render(ConnectionStatus.Live);

    expect(element.querySelectorAll('.admin-nav__item')).toHaveLength(ADMIN_NAV_ITEMS.length);
    expect(element.querySelector('main router-outlet')).not.toBeNull();
  });

  it('shows the number of new orders on the Orders entry', async () => {
    const element = await render(ConnectionStatus.Live, 2);

    expect(
      element.querySelector('.admin-nav__item[href="/orders"] .admin-nav__badge')?.textContent
    ).toBe('2');
  });
});
