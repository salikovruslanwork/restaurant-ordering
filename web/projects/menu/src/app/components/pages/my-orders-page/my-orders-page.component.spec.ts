import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import type { Order } from '@restaurant/contracts';
import { LoadStatus, menuActions, menuFeature } from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';
import { myOrdersActions } from '@menu/store/my-orders/my-orders.actions';
import { myOrdersFeature } from '@menu/store/my-orders/my-orders.reducer';

import { MyOrdersPageComponent } from './my-orders-page.component';

describe('MyOrdersPageComponent', () => {
  let store: MockStore;

  async function render(
    state: {
      orders?: Order[];
      status?: LoadStatus;
      menu?: LoadStatus;
      freshIds?: string[];
    } = {}
  ): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: myOrdersFeature.selectAllOrders, value: state.orders ?? [] },
            { selector: myOrdersFeature.selectFreshIds, value: state.freshIds ?? [] },
            {
              selector: myOrdersFeature.selectLoadStatus,
              value: state.status ?? LoadStatus.Loaded
            },
            { selector: menuFeature.selectLoadStatus, value: state.menu ?? LoadStatus.Loaded }
          ]
        })
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(MyOrdersPageComponent);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const button = (element: HTMLElement, text: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(text)
    );

  afterEach(() => {
    store.resetSelectors();
  });

  it('lists my orders with the fresh one highlighted', async () => {
    const element = await render({
      orders: [makeOrder({ id: 'b', number: 1002 }), makeOrder()],
      freshIds: ['b']
    });

    expect(element.querySelector('h1')?.textContent).toBe('My orders');
    expect(
      [...element.querySelectorAll('.order-card__number')].map((title) => title.textContent)
    ).toEqual(['Order #1002', 'Order #1001']);
    expect(element.querySelectorAll('.order-card--fresh')).toHaveLength(1);
  });

  it('shows skeleton cards while loading', async () => {
    const element = await render({ status: LoadStatus.Loading });

    expect(element.querySelectorAll('.my-orders-page__skeleton')).toHaveLength(3);
    expect(element.querySelector('[role="status"]')?.textContent).toBe('Loading your orders…');
  });

  it('shows the empty state with a way back to the menu', async () => {
    const element = await render();
    const link = (label: string) =>
      [...element.querySelectorAll('a')].find((anchor) => anchor.textContent?.includes(label));

    expect(element.querySelector('.empty-state__title')?.textContent).toBe('No orders yet');
    expect(link('Browse the menu')?.getAttribute('href')).toBe('/');
    expect(link('Menu')?.getAttribute('href')).toBe('/');
  });

  it('retries the orders, or the menu first when it failed', async () => {
    const element = await render({ status: LoadStatus.Failed });

    expect(element.textContent).toContain('We couldn’t load your orders.');
    button(element, 'Retry')?.click();
    expect(store.dispatch).toHaveBeenCalledWith(myOrdersActions.load());

    store.overrideSelector(menuFeature.selectLoadStatus, LoadStatus.Failed);
    store.refreshState();
    button(element, 'Retry')?.click();
    expect(store.dispatch).toHaveBeenLastCalledWith(menuActions.load());
  });
});
