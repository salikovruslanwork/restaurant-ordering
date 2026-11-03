import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  signal,
  viewChild,
  type DoCheck
} from '@angular/core';
import { NgControl, type ControlValueAccessor } from '@angular/forms';
import { MatFormField, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { fieldErrorMessage } from '../../helpers/field-error';
import { TextFieldType } from '../../models/text-field.model';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

@Component({
  selector: 'app-text-field',
  imports: [IconComponent, MatFormField, MatInput, MatPrefix],
  templateUrl: './text-field.component.html',
  styleUrl: './text-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextFieldComponent implements ControlValueAccessor, DoCheck {
  readonly label = input.required<string>();
  readonly type = input(TextFieldType.Text);
  readonly hint = input<string | null>(null);
  readonly errorMessages = input<Record<string, string>>({});
  readonly placeholder = input('');
  readonly large = input(false, { transform: booleanAttribute });
  readonly compact = input(false, { transform: booleanAttribute });
  readonly labelHidden = input(false, { transform: booleanAttribute });
  readonly twoLineMessage = input(false, { transform: booleanAttribute });

  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly materialInput = viewChild(MatInput);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private syncedError: string | null = null;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly TextFieldType = TextFieldType;
  protected readonly id = `text-field-${nextId++}`;
  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly errorText = signal<string | null>(null);
  protected readonly errorMatcher = { isErrorState: () => this.errorText() !== null };
  protected readonly describedBy = computed(() =>
    this.getDescribedBy(this.errorText(), this.hint())
  );

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    // Material re-checks the matcher by itself only when it owns the form control.
    afterRenderEffect(() => this.syncErrorState(this.errorText()));
  }

  // Controls don't notify OnPush components when marked as touched from outside.
  ngDoCheck(): void {
    const control = this.ngControl;
    const isShown = control?.invalid && control.touched;
    this.errorText.set(isShown ? fieldErrorMessage(control.errors, this.errorMessages()) : null);
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(onChange: (value: string) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected handleInput(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  private syncErrorState(error: string | null): void {
    this.materialInput()?.updateErrorState();
    if (error !== this.syncedError) {
      this.syncedError = error;
      this.changeDetector.markForCheck();
    }
  }

  private getDescribedBy(error: string | null, hint: string | null): string {
    if (error) {
      return `${this.id}-error`;
    }
    return hint ? `${this.id}-hint` : '';
  }
}
