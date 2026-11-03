import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import type { Category, Id } from '@restaurant/contracts';
import {
  ButtonComponent,
  SegmentedButtonComponent,
  SelectComponent,
  type SelectOption
} from '@shared/ui';
import { ALL_CATEGORIES, AVAILABILITY_FILTER_OPTIONS } from '@admin/config/items.config';
import type { AvailabilityFilter, ItemFilter } from '@admin/models/menu-editor.model';

@Component({
  selector: 'app-items-toolbar',
  imports: [ButtonComponent, ReactiveFormsModule, SegmentedButtonComponent, SelectComponent],
  templateUrl: './items-toolbar.component.html',
  styleUrl: './items-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemsToolbarComponent {
  readonly categories = input.required<Category[]>();
  readonly filter = input.required<ItemFilter>();
  readonly addDisabled = input(false, { transform: booleanAttribute });

  readonly categoryChanged = output<Id | null>();
  readonly availabilityChanged = output<AvailabilityFilter>();
  readonly addClicked = output();

  protected readonly availabilityOptions = AVAILABILITY_FILTER_OPTIONS;
  protected readonly categoryControl = new FormControl<string>(ALL_CATEGORIES, {
    nonNullable: true
  });
  protected readonly categoryOptions = computed(() => this.getCategoryOptions(this.categories()));

  constructor() {
    effect(() => this.syncCategory(this.filter().categoryId));
    this.categoryControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.categoryChanged.emit(value === ALL_CATEGORIES ? null : value));
  }

  private getCategoryOptions(categories: Category[]): SelectOption<string>[] {
    return [
      { value: ALL_CATEGORIES, label: 'All categories' },
      ...categories.map(({ id, name }) => ({ value: id, label: name }))
    ];
  }

  private syncCategory(categoryId: Id | null): void {
    this.categoryControl.setValue(categoryId ?? ALL_CATEGORIES, { emitEvent: false });
  }
}
