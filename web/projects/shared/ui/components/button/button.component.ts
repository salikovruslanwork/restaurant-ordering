import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButton, MatFabButton, MatIconButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import {
  BUTTON_APPEARANCE,
  BUTTON_ICON_SIZE,
  FAB_ICON_SIZE,
  ICON_BUTTON_ICON_SIZE,
  ICON_BUTTON_SMALL_ICON_SIZE
} from '../../config/button.config';
import { ButtonSize, ButtonVariant, type ButtonType } from '../../models/button.model';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-button',
  imports: [
    IconComponent,
    MatButton,
    MatFabButton,
    MatIconButton,
    NgTemplateOutlet,
    RouterLink,
    SpinnerComponent
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  readonly variant = input(ButtonVariant.Filled);
  readonly size = input(ButtonSize.Medium);
  readonly type = input<ButtonType>('button');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly block = input(false, { transform: booleanAttribute });
  readonly icon = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly ariaExpanded = input<boolean | null>(null);
  // Renders a router link styled as a button, for the filled, outlined, text and tonal variants.
  readonly link = input<string | null>(null);

  protected readonly ButtonVariant = ButtonVariant;
  protected readonly appearance = computed(() => BUTTON_APPEARANCE[this.variant()]);
  protected readonly classes = computed(() => this.getClasses(this.variant(), this.size()));
  protected readonly iconSize = computed(() => this.getIconSize(this.variant(), this.size()));

  private getClasses(variant: ButtonVariant, size: ButtonSize): string {
    return `button button--${variant} button--${size}`;
  }

  private getIconSize(variant: ButtonVariant, size: ButtonSize): number {
    if (variant === ButtonVariant.Fab) {
      return FAB_ICON_SIZE;
    }
    if (variant === ButtonVariant.Icon) {
      return size === ButtonSize.Small ? ICON_BUTTON_SMALL_ICON_SIZE : ICON_BUTTON_ICON_SIZE;
    }
    return BUTTON_ICON_SIZE;
  }
}
