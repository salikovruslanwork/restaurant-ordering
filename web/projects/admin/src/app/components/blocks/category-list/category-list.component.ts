import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  untracked
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import type { Id } from '@restaurant/contracts';
import {
  ButtonComponent,
  ButtonSize,
  ButtonVariant,
  PluralizePipe,
  SkeletonComponent,
  TextFieldComponent
} from '@shared/ui';
import {
  CATEGORY_NAME_ERRORS,
  CATEGORY_SKELETON_ROWS,
  NEW_CATEGORY_KEY
} from '@admin/config/categories.config';
import { categoryNameValidator } from '@admin/helpers/category-name.validator';
import type { CategoryMove, CategoryRow } from '@admin/models/category-list.model';
import { MoveDirection, type CategoryEdit } from '@admin/models/menu-editor.model';

@Component({
  selector: 'app-category-list',
  imports: [
    ButtonComponent,
    NgTemplateOutlet,
    PluralizePipe,
    ReactiveFormsModule,
    SkeletonComponent,
    TextFieldComponent
  ],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryListComponent {
  readonly rows = input.required<CategoryRow[]>();
  readonly loading = input(false, { transform: booleanAttribute });
  readonly edit = input<CategoryEdit | null>(null);
  readonly busyIds = input<Id[]>([]);
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly freshIds = input<ReadonlySet<Id>>(new Set());

  readonly moved = output<CategoryMove>();
  readonly editStarted = output<Id>();
  readonly editCancelled = output();
  readonly saved = output<string>();
  readonly deleteRequested = output<CategoryRow>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private lastEditedId: Id | null = null;

  protected readonly MoveDirection = MoveDirection;
  protected readonly ButtonSize = ButtonSize;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly nameErrors = CATEGORY_NAME_ERRORS;
  protected readonly skeletonRows = Array.from({ length: CATEGORY_SKELETON_ROWS }, (_, i) => i);
  protected readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: categoryNameValidator(() => this.getOtherNames(this.rows(), this.edit()))
  });

  protected readonly isCreating = computed(() => this.edit()?.id === null);
  protected readonly isSaving = computed(() => this.edit()?.isSaving ?? false);
  protected readonly hasBusyRow = computed(() => this.busyIds().length > 0);
  protected readonly busyRows = computed(() => new Set(this.busyIds()));
  private readonly editKey = computed(() => this.getEditKey(this.edit()));

  constructor() {
    effect(() => this.openEditor(this.editKey()));
    effect(() => this.showServerError(this.edit()?.error ?? null));
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.nameControl.markAsTouched();
    if (this.nameControl.invalid || this.isSaving() || this.readOnly()) {
      this.focus('input');
      return;
    }
    this.saved.emit(this.nameControl.value.trim());
  }

  protected cancel(): void {
    if (!this.isSaving()) {
      this.editCancelled.emit();
    }
  }

  private getEditKey(edit: CategoryEdit | null): string | null {
    return edit ? (edit.id ?? NEW_CATEGORY_KEY) : null;
  }

  private getOtherNames(rows: CategoryRow[], edit: CategoryEdit | null): string[] {
    return rows.filter(({ id }) => id !== edit?.id).map(({ name }) => name);
  }

  private openEditor(key: string | null): void {
    if (key === null) {
      if (this.lastEditedId) {
        this.focus(`[data-id="${this.lastEditedId}"] .category-list__edit button`);
      }
      this.lastEditedId = null;
      return;
    }
    // Resetting runs the validator, which reads rows; the editor must not reopen when rows change.
    untracked(() => {
      const row = this.rows().find(({ id }) => id === key);
      this.lastEditedId = row?.id ?? null;
      this.nameControl.reset(row?.name ?? '');
    });
    this.focus('.category-list__form input');
  }

  private showServerError(error: string | null): void {
    if (error) {
      this.nameControl.setErrors({ server: error });
      this.nameControl.markAsTouched();
      this.focus('.category-list__form input');
    }
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector
    });
  }
}
