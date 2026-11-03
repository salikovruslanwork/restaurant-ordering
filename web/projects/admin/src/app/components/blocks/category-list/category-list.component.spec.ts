import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import type { Id } from '@restaurant/contracts';
import { CATEGORY_SKELETON_ROWS } from '@admin/config/categories.config';
import type { CategoryMove, CategoryRow } from '@admin/models/category-list.model';
import { MoveDirection, type CategoryEdit } from '@admin/models/menu-editor.model';

import { CategoryListComponent } from './category-list.component';

@Component({
  imports: [CategoryListComponent],
  template: `<app-category-list
    [busyIds]="busyIds()"
    [edit]="edit()"
    [freshIds]="freshIds()"
    [loading]="loading()"
    [readOnly]="readOnly()"
    [rows]="rows()"
    (deleteRequested)="deleted.push($event)"
    (editCancelled)="cancelled = cancelled + 1"
    (editStarted)="started.push($event)"
    (moved)="moves.push($event)"
    (saved)="names.push($event)"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class HostComponent {
  readonly rows = signal<CategoryRow[]>([
    { id: 'soup', name: 'Soups', itemCount: 1 },
    { id: 'tea', name: 'Tea', itemCount: 0 },
    { id: 'cake', name: 'Cakes', itemCount: 12 }
  ]);
  readonly loading = signal(false);
  readonly edit = signal<CategoryEdit | null>(null);
  readonly busyIds = signal<Id[]>([]);
  readonly freshIds = signal<ReadonlySet<Id>>(new Set());
  readonly readOnly = signal(false);
  readonly moves: CategoryMove[] = [];
  readonly started: Id[] = [];
  readonly names: string[] = [];
  readonly deleted: CategoryRow[] = [];
  cancelled = 0;
}

describe('CategoryListComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const element = (): HTMLElement => fixture.nativeElement;
  const rows = () => [...element().querySelectorAll<HTMLElement>('li.category-list__row')];
  const button = (label: string) =>
    element().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const input = () => element().querySelector<HTMLInputElement>('.category-list__form input');
  const buttonByText = (text: string) =>
    [...element().querySelectorAll<HTMLButtonElement>('.category-list__form button')].find(
      (candidate) => candidate.textContent?.trim() === text
    );

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await fixture.whenStable();
  }

  async function update(change: () => void): Promise<void> {
    change();
    await fixture.whenStable();
  }

  async function type(value: string): Promise<void> {
    const field = input();
    if (!field) {
      throw new Error('No editor is open');
    }
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element()
      .querySelector('.category-list__form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  it('shows skeleton rows and a status message while loading', async () => {
    await render();
    await update(() => host.loading.set(true));

    expect(element().querySelectorAll('.category-list__row')).toHaveLength(CATEGORY_SKELETON_ROWS);
    expect(element().querySelector('[role="status"]')?.textContent).toBe('Loading…');
    expect(element().querySelector('ol')).toBeNull();
  });

  it('highlights freshly changed categories', async () => {
    await render();

    await update(() => host.freshIds.set(new Set(['tea'])));

    expect(rows().map((row) => row.classList.contains('category-list__row--fresh'))).toEqual([
      false,
      true,
      false
    ]);
  });

  it('lists categories in order with their position and item count', async () => {
    await render();

    expect(element().querySelector('ol')?.getAttribute('aria-label')).toBe(
      'Categories in menu order'
    );
    expect(
      rows().map((row) => [
        row.querySelector('.category-list__position')?.textContent,
        row.querySelector('.category-list__name')?.textContent,
        row.querySelector('.category-list__count')?.textContent
      ])
    ).toEqual([
      ['1', 'Soups', '1 item'],
      ['2', 'Tea', '0 items'],
      ['3', 'Cakes', '12 items']
    ]);
  });

  describe('sorting', () => {
    it('moves a category up or down', async () => {
      await render();

      button('Move Tea up')?.click();
      button('Move Tea down')?.click();

      expect(host.moves).toEqual([
        { id: 'tea', direction: MoveDirection.Up },
        { id: 'tea', direction: MoveDirection.Down }
      ]);
    });

    it('can’t move the first one up or the last one down', async () => {
      await render();

      expect(button('Move Soups up')?.disabled).toBe(true);
      expect(button('Move Soups down')?.disabled).toBe(false);
      expect(button('Move Cakes down')?.disabled).toBe(true);
    });

    it('blocks every move while a category is busy, and that row’s actions', async () => {
      await render();
      await update(() => host.busyIds.set(['tea']));

      expect(button('Move Soups down')?.disabled).toBe(true);
      expect(button('Rename Tea')?.disabled).toBe(true);
      expect(button('Delete Tea')?.disabled).toBe(true);
      expect(button('Rename Soups')?.disabled).toBe(false);
      expect(rows()[1]?.getAttribute('aria-busy')).toBe('true');
    });
  });

  it('asks to delete a category', async () => {
    await render();

    button('Delete Cakes')?.click();

    expect(host.deleted).toEqual([{ id: 'cake', name: 'Cakes', itemCount: 12 }]);
  });

  it('turns off every change while read-only', async () => {
    await render();
    await update(() => host.readOnly.set(true));

    const enabled = [...element().querySelectorAll<HTMLButtonElement>('li button')].filter(
      (candidate) => !candidate.disabled
    );
    expect(enabled).toEqual([]);
  });

  describe('editing', () => {
    it('asks to rename a category', async () => {
      await render();

      button('Rename Tea')?.click();

      expect(host.started).toEqual(['tea']);
    });

    it('opens the editor in place with the current name and focuses it', async () => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: false, error: null }));

      expect(rows()[1]?.querySelector('.category-list__name')).toBeNull();
      expect(input()?.value).toBe('Tea');
      expect(element().querySelector('.category-list__form label')?.textContent?.trim()).toBe(
        'New name for Tea'
      );
      expect(document.activeElement).toBe(input());
    });

    it('opens an empty row at the end for a new category', async () => {
      await render();
      await update(() => host.edit.set({ id: null, isSaving: false, error: null }));

      expect(rows()).toHaveLength(4);
      expect(rows()[3]?.querySelector('.category-list__position')?.textContent).toBe('4');
      expect(input()?.value).toBe('');
      expect(element().querySelector('.category-list__form label')?.textContent?.trim()).toBe(
        'New category name'
      );
    });

    it('saves the trimmed name', async () => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: false, error: null }));

      await type('  Green tea  ');
      await submit();

      expect(host.names).toEqual(['Green tea']);
    });

    it.each([
      ['', 'Enter a category name'],
      ['a'.repeat(31), 'Keep the name under 30 characters'],
      [' soups ', 'A category with this name already exists']
    ])('rejects “%s” before sending it', async (value, message) => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: false, error: null }));

      await type(value);
      await submit();

      expect(host.names).toEqual([]);
      expect(element().querySelector('.text-field__error')?.textContent).toContain(message);
    });

    it('lets a category keep its own name', async () => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: false, error: null }));

      await type('TEA');
      await submit();

      expect(host.names).toEqual(['TEA']);
    });

    it('shows a server error on the field', async () => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: true, error: null }));

      await update(() =>
        host.edit.set({ id: 'tea', isSaving: false, error: 'This category no longer exists.' })
      );

      expect(element().querySelector('.text-field__error')?.textContent).toContain(
        'This category no longer exists.'
      );
      expect(input()?.value).toBe('Tea');
    });

    it('shows saving and doesn’t send twice', async () => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: true, error: null }));

      await submit();

      expect(host.names).toEqual([]);
      expect(buttonByText('Save')?.getAttribute('aria-busy')).toBe('true');
      expect(buttonByText('Cancel')?.disabled).toBe(true);
    });

    it('can’t save while read-only', async () => {
      await render();
      await update(() => {
        host.edit.set({ id: 'tea', isSaving: false, error: null });
        host.readOnly.set(true);
      });

      await submit();

      expect(buttonByText('Save')?.disabled).toBe(true);
      expect(host.names).toEqual([]);
    });

    it('cancels with the button or Escape', async () => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: false, error: null }));

      buttonByText('Cancel')?.click();
      input()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(host.cancelled).toBe(2);
    });

    it('returns focus to the rename button when the editor closes', async () => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: false, error: null }));

      await update(() => host.edit.set(null));

      expect(document.activeElement).toBe(button('Rename Tea'));
    });

    it('doesn’t reset the typed text when the rows change', async () => {
      await render();
      await update(() => host.edit.set({ id: 'tea', isSaving: false, error: null }));
      await type('Green tea');

      await update(() => host.rows.update((current) => [...current]));

      expect(input()?.value).toBe('Green tea');
    });
  });
});
