import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { PricingKind } from '@restaurant/contracts';
import type { ItemAvailabilityChange, ItemRow } from '@admin/models/item-list.model';

import { ItemsTableComponent } from './items-table.component';

const rows: ItemRow[] = [
  {
    id: 'miso',
    name: 'Miso',
    description: 'Warm broth',
    categoryName: 'Soups',
    pricing: { kind: PricingKind.Fixed, price: 450 },
    isAvailable: true,
    isSaving: false,
    isDeleting: false
  },
  {
    id: 'cake',
    name: 'Custom cake',
    description: '',
    categoryName: 'Desserts',
    pricing: { kind: PricingKind.Open },
    isAvailable: false,
    isSaving: true,
    isDeleting: false
  }
];

describe('ItemsTableComponent', () => {
  let fixture: ComponentFixture<ItemsTableComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const row = (index: number) => element().querySelectorAll<HTMLElement>('[role="row"]')[index];
  const button = (label: string) =>
    element().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const toggle = (name: string) =>
    element().querySelector<HTMLButtonElement>(`[aria-label="${name} available"]`);

  async function render(readOnly = false): Promise<void> {
    fixture = TestBed.createComponent(ItemsTableComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('readOnly', readOnly);
    await fixture.whenStable();
  }

  it('highlights freshly changed rows', async () => {
    await render();

    fixture.componentRef.setInput('freshIds', new Set(['cake']));
    await fixture.whenStable();

    expect(row(1)?.classList).not.toContain('items-table__row--fresh');
    expect(row(2)?.classList).toContain('items-table__row--fresh');
  });

  it('is an accessible table with headers and row indexes', async () => {
    await render();

    expect(element().querySelector('[role="table"]')?.getAttribute('aria-rowcount')).toBe('3');
    expect(
      [...element().querySelectorAll('[role="columnheader"]')].map((cell) =>
        cell.textContent?.trim()
      )
    ).toEqual(['Image', 'Name', 'Category', 'Price', 'Availability', 'Actions']);
    expect(row(1)?.getAttribute('aria-rowindex')).toBe('2');
  });

  it('shows the name, description, category, price and availability', async () => {
    await render();

    expect(row(1)?.querySelector('.items-table__name')?.textContent).toBe('Miso');
    expect(row(1)?.querySelector('.items-table__description')?.textContent).toBe('Warm broth');
    expect(row(1)?.textContent).toContain('Soups');
    expect(row(1)?.querySelector('.money')?.textContent).toContain('$4.50');
    expect(row(1)?.querySelector('.items-table__state')?.textContent).toBe('Available');
    expect(row(2)?.querySelector('.money--open-chip')).not.toBeNull();
    expect(row(2)?.querySelector('.dish-image--muted')).not.toBeNull();
  });

  it('shows saving and blocks the switch while a change runs', async () => {
    await render();

    expect(row(2)?.querySelector('.saving-indicator')).not.toBeNull();
    expect(toggle('Custom cake')?.disabled).toBe(true);
    expect(toggle('Miso')?.disabled).toBe(false);
  });

  it('emits availability, edit and delete requests', async () => {
    await render();
    const changes: ItemAvailabilityChange[] = [];
    const edits: string[] = [];
    const deletes: ItemRow[] = [];
    fixture.componentInstance.availabilityChanged.subscribe((change) => changes.push(change));
    fixture.componentInstance.editRequested.subscribe((id) => edits.push(id));
    fixture.componentInstance.deleteRequested.subscribe((deleted) => deletes.push(deleted));

    toggle('Miso')?.click();
    button('Edit Miso')?.click();
    button('Delete Miso')?.click();

    expect(changes).toEqual([{ id: 'miso', isAvailable: false }]);
    expect(edits).toEqual(['miso']);
    expect(deletes).toEqual([rows[0]]);
  });

  it('turns every change off while read-only', async () => {
    await render(true);

    const enabled = [
      ...element().querySelectorAll<HTMLButtonElement>('[role="row"] button')
    ].filter((candidate) => !candidate.disabled);
    expect(enabled).toEqual([]);
  });
});
