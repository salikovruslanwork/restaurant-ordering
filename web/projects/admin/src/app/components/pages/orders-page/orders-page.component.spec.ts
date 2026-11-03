import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { EMPTY, of } from 'rxjs';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { OrderStatus } from '@restaurant/contracts';
import { LoadStatus } from '@shared/data-access';
import { makeOrder } from '@shared/data-access/testing/orders';
import { DialogService, LayoutService } from '@shared/ui';
import type { OrderRow, StatusFilterOption } from '@admin/models/admin-orders.model';
import { adminOrdersActions } from '@admin/store/admin-orders/admin-orders.actions';
import { adminOrdersFeature } from '@admin/store/admin-orders/admin-orders.reducer';
import { selectIsReadOnly } from '@admin/store/connection/connection.selectors';

import { OrdersPageComponent } from './orders-page.component';

const order = makeOrder();
const rows: OrderRow[] = [{ order, summary: '2× Miso', isSaving: false, isFresh: false }];
const options = (count: number): StatusFilterOption[] => [
  { status: null, label: 'All', count },
  { status: OrderStatus.Placed, label: 'Placed', count }
];

describe('OrdersPageComponent', () => {
  let fixture: ComponentFixture<OrdersPageComponent>;
  let store: MockStore;
  let open: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let answer: boolean;

  const element = (): HTMLElement => fixture.nativeElement;
  const button = (label: string) =>
    element().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  async function render(
    state: {
      rows?: OrderRow[];
      count?: number;
      status?: LoadStatus;
      filter?: OrderStatus | null;
      mobile?: boolean;
      readOnly?: boolean;
    } = {}
  ): Promise<void> {
    answer = true;
    open = vi.fn(() => ({ closed$: of(answer) }));
    confirm = vi.fn(() => (answer ? of(true) : EMPTY));
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: adminOrdersFeature.selectOrderRows, value: state.rows ?? rows },
            {
              selector: adminOrdersFeature.selectStatusFilterOptions,
              value: options(state.count ?? 1)
            },
            { selector: adminOrdersFeature.selectStatusFilter, value: state.filter ?? null },
            { selector: adminOrdersFeature.selectPlacedCount, value: state.count ?? 1 },
            {
              selector: adminOrdersFeature.selectLoadStatus,
              value: state.status ?? LoadStatus.Loaded
            },
            { selector: selectIsReadOnly, value: state.readOnly ?? false }
          ]
        }),
        { provide: DialogService, useValue: { open, confirm } },
        {
          provide: LayoutService,
          useValue: { isMobile: signal(state.mobile ?? false) }
        }
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(OrdersPageComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    store.resetSelectors();
  });

  it('shows the new-order count, the filter and the table', async () => {
    await render();

    expect(element().querySelector('h1')?.textContent).toBe('Orders');
    expect(element().querySelector('.admin-page__meta')?.textContent?.trim()).toBe('1 new order');
    expect(element().querySelector('app-status-filter')).not.toBeNull();
    expect(element().querySelector('app-orders-table')).not.toBeNull();
  });

  it('shows cards on mobile', async () => {
    await render({ mobile: true });

    expect(element().querySelector('app-orders-table')).toBeNull();
    expect(element().querySelectorAll('app-order-admin-card')).toHaveLength(1);
  });

  it('shows skeletons while the first load runs', async () => {
    await render({ status: LoadStatus.Loading, rows: [], count: 0 });
    expect(element().querySelector('.orders-page__skeleton')).not.toBeNull();
    expect(element().querySelector('[role="status"]')?.textContent).toBe('Loading…');
  });

  it('retries a failed first load', async () => {
    await render({ status: LoadStatus.Failed, rows: [], count: 0 });

    element().querySelector<HTMLButtonElement>('.error-state button')?.click();

    expect(store.dispatch).toHaveBeenCalledWith(adminOrdersActions.load());
  });

  it('says when there are no orders yet', async () => {
    await render({ rows: [], count: 0 });

    expect(element().querySelector('.empty-state__title')?.textContent).toBe('No orders yet');
    expect(element().querySelector('app-status-filter')).toBeNull();
  });

  it('offers to show all orders when a filter matches none', async () => {
    await render({ rows: [], filter: OrderStatus.Ready });

    expect(element().querySelector('.empty-state__title')?.textContent).toBe('No ready orders');
    element().querySelector<HTMLButtonElement>('.empty-state button')?.click();
    expect(store.dispatch).toHaveBeenCalledWith(
      adminOrdersActions.filterByStatus({ status: null })
    );
  });

  it('filters by status', async () => {
    await render();

    [...element().querySelectorAll<HTMLButtonElement>('.status-filter__chip')][1]?.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      adminOrdersActions.filterByStatus({ status: OrderStatus.Placed })
    );
  });

  it('expands and collapses details', async () => {
    await render();
    const toggle = () => button('Details of order #1001')?.click();

    toggle();
    await fixture.whenStable();
    expect(element().querySelector('app-order-lines')).not.toBeNull();

    toggle();
    await fixture.whenStable();
    expect(element().querySelector('app-order-lines')).toBeNull();
  });

  it('changes a status at once', async () => {
    await render();

    button('Start preparing, order #1001')?.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      adminOrdersActions.changeStatus({ order, target: OrderStatus.Preparing })
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it('cancels only after confirmation', async () => {
    await render();

    answer = false;
    button('Cancel order #1001')?.click();
    expect(store.dispatch).not.toHaveBeenCalled();

    answer = true;
    button('Cancel order #1001')?.click();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cancel order #1001?' }));
    expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(
      adminOrdersActions.changeStatus({ order, target: OrderStatus.Cancelled })
    );
  });

  it('turns actions off while read-only', async () => {
    await render({ readOnly: true });

    expect(button('Start preparing, order #1001')?.disabled).toBe(true);
  });
});
