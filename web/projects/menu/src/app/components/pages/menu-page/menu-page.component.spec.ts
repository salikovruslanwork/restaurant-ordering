import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { EMPTY, of } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { PricingKind, type Category, type Id, type MenuItem } from '@restaurant/contracts';
import { LoadStatus, menuActions, menuFeature } from '@shared/data-access';
import { DialogService, LayoutService } from '@shared/ui';
import { OpenPriceDialogComponent } from '@menu/components/dialogs/open-price-dialog/open-price-dialog.component';
import type { OpenPriceChoice } from '@menu/models/cart.model';
import { cartActions } from '@menu/store/cart/cart.actions';
import { cartSelectors, EMPTY_SUMMARY } from '@menu/testing/cart';
import { makeCategory, makeItem } from '@menu/testing/menu';

import { MenuPageComponent } from './menu-page.component';

const soup = makeCategory('soup', 'Soups', 0);
const tea = makeCategory('tea', 'Tea', 1);
const groups = new Map<Id, MenuItem[]>([
  ['soup', [makeItem()]],
  ['tea', [makeItem({ id: 'oolong', categoryId: 'tea', name: 'Oolong' })]]
]);

describe('MenuPageComponent', () => {
  let fixture: ComponentFixture<MenuPageComponent>;
  let store: MockStore;
  let open: ReturnType<typeof vi.fn>;
  let choice: OpenPriceChoice | undefined;
  const element = (): HTMLElement => fixture.nativeElement;
  const chip = (name: string) =>
    [...element().querySelectorAll<HTMLButtonElement>('.category-bar__chip')].find(
      (button) => button.textContent?.trim() === name
    );
  const names = () =>
    [...element().querySelectorAll('app-menu-item h2')].map((name) => name.textContent);
  const button = (label: string) =>
    element().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  async function render(
    state: {
      status?: LoadStatus;
      categories?: Category[];
      groups?: Map<Id, MenuItem[]>;
      mobile?: boolean;
      cart?: Parameters<typeof cartSelectors>[0];
    } = {}
  ): Promise<void> {
    const categories = state.categories ?? [soup, tea];
    choice = undefined;
    open = vi.fn(() => ({ closed$: of(choice) }));
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => EMPTY),
        provideMockStore({
          selectors: [
            { selector: menuFeature.selectLoadStatus, value: state.status ?? LoadStatus.Loaded },
            { selector: menuFeature.selectAllCategories, value: categories },
            { selector: menuFeature.selectCategoriesWithItems, value: categories },
            {
              selector: menuFeature.selectItemsByCategory,
              value: categories.length ? (state.groups ?? groups) : new Map()
            },
            ...cartSelectors(state.cart)
          ]
        }),
        {
          provide: LayoutService,
          useValue: { isMobile: signal(state.mobile ?? false) }
        },
        { provide: DialogService, useValue: { open } }
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(MenuPageComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    store.resetSelectors();
  });

  it('shows the full menu with a dish count', async () => {
    await render();

    expect(element().querySelector('h1')?.textContent).toBe('Full menu');
    expect(element().querySelector('.menu-page__count')?.textContent).toBe('2 dishes');
    expect(names()).toEqual(['Miso', 'Oolong']);
  });

  it('shows one category when chosen, and all again', async () => {
    await render();

    chip('Tea')?.click();
    await fixture.whenStable();
    expect(element().querySelector('h1')?.textContent).toBe('Tea');
    expect(element().querySelector('.menu-page__count')?.textContent).toBe('1 dish');
    expect(names()).toEqual(['Oolong']);

    chip('All')?.click();
    await fixture.whenStable();
    expect(element().querySelector('h1')?.textContent).toBe('Full menu');
    expect(element().querySelector('.menu-page__count')?.textContent).toBe('2 dishes');
    expect(names()[0]).toBe('Miso');
  });

  it('goes back to All when the chosen category empties', async () => {
    await render();
    chip('Tea')?.click();
    await fixture.whenStable();

    store.overrideSelector(menuFeature.selectCategoriesWithItems, [soup]);
    store.refreshState();
    await fixture.whenStable();

    expect(element().querySelector('h1')?.textContent).toBe('Full menu');
    expect(chip('Tea')).toBeUndefined();
    expect(chip('All')?.getAttribute('aria-current')).toBe('true');
  });

  it('shows skeletons while the menu loads', async () => {
    await render({ status: LoadStatus.Loading, categories: [] });

    expect(element().querySelectorAll('.menu-skeleton__card')).toHaveLength(9);
    expect(element().querySelector('app-category-bar app-skeleton')).not.toBeNull();
    expect(element().querySelector('[role="status"]')?.textContent).toBe('Loading the menu…');
  });

  it('offers a retry when the first load fails', async () => {
    await render({ status: LoadStatus.Failed, categories: [] });

    element().querySelector<HTMLButtonElement>('.error-state button')?.click();

    expect(store.dispatch).toHaveBeenCalledWith(menuActions.load());
  });

  it('says when the menu is empty', async () => {
    await render({ status: LoadStatus.Loaded, categories: [] });

    expect(element().querySelector('.empty-state__title')?.textContent).toBe(
      'The menu is empty right now'
    );
  });

  describe('cart', () => {
    it('shows the cart panel beside the menu on desktop', async () => {
      await render();

      expect(
        element().querySelector('.menu-page__cart app-cart-panel, app-cart-panel')
      ).not.toBeNull();
      expect(element().querySelector('app-cart-bar')).toBeNull();
    });

    it('has no panel and no cart bar on mobile while the cart is empty', async () => {
      await render({ mobile: true });

      expect(element().querySelector('app-cart-panel')).toBeNull();
      expect(element().querySelector('app-cart-bar')).toBeNull();
    });

    it('opens the cart from the cart bar on mobile', async () => {
      await render({ mobile: true, cart: { summary: { ...EMPTY_SUMMARY, count: 2, total: 900 } } });
      element().querySelector<HTMLButtonElement>('app-cart-bar button')?.click();
      expect(store.dispatch).toHaveBeenCalledWith(cartActions.openRequested());
    });

    it('adds a dish and changes its quantity', async () => {
      await render({ cart: { quantities: { oolong: 2 } } });

      button('Add Miso')?.click();
      button('Increase Oolong')?.click();

      expect(store.dispatch).toHaveBeenCalledWith(cartActions.itemAdded({ item: makeItem() }));
      expect(store.dispatch).toHaveBeenCalledWith(
        cartActions.quantityChanged({ key: 'oolong', quantity: 3 })
      );
    });

    it('asks for the price of an open-price dish, and adds it when confirmed', async () => {
      const cake = makeItem({ id: 'cake', name: 'Cake', pricing: { kind: PricingKind.Open } });
      await render({
        groups: new Map([
          ['soup', [cake]],
          ['tea', []]
        ])
      });

      button('Add Cake — set your price')?.click();
      await vi.dynamicImportSettled();
      expect(open).toHaveBeenCalledWith(OpenPriceDialogComponent, { data: { item: cake } });
      expect(store.dispatch).not.toHaveBeenCalled();

      choice = { price: 1250, quantity: 2 };
      button('Add Cake — set your price')?.click();
      await vi.dynamicImportSettled();
      expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(
        cartActions.openPriceItemAdded({ item: cake, price: 1250, quantity: 2 })
      );
    });
  });
});
