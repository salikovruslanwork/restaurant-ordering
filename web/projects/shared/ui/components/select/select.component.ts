import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  type DoCheck
} from '@angular/core';
import { NgControl, type ControlValueAccessor } from '@angular/forms';

import { fieldErrorMessage } from '../../helpers/field-error';
import type { SelectOption } from '../../models/select.model';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

@Component({
  selector: 'app-select',
  imports: [IconComponent],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectComponent<T> implements ControlValueAccessor, DoCheck {
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption<T>[]>();
  readonly errorMessages = input<Record<string, string>>({});
  readonly compact = input(false, { transform: booleanAttribute });
  readonly placeholder = input('');

  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private onChange: (value: T | null) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected readonly id = `select-${nextId++}`;
  protected readonly value = signal<T | null>(null);
  protected readonly isDisabled = signal(false);
  protected readonly errorText = signal<string | null>(null);
  protected readonly reservesMessage = computed(() => Object.keys(this.errorMessages()).length > 0);
  // Native options carry their index, so any value type round-trips unchanged.
  protected readonly selectedIndex = computed(() =>
    this.options().findIndex((option) => option.value === this.value())
  );

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngDoCheck(): void {
    const control = this.ngControl;
    const isShown = control?.invalid && control.touched;
    this.errorText.set(isShown ? fieldErrorMessage(control.errors, this.errorMessages()) : null);
  }

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(onChange: (value: T | null) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected handleSelection(index: string): void {
    const option = this.options()[Number(index)];
    if (option) {
      this.value.set(option.value);
      this.onChange(option.value);
    }
  }
}
