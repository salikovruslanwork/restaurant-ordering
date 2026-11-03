import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

import {
  DISH_IMAGE_ICON_SIZES,
  DISH_IMAGE_PLACEHOLDER_ICON,
  DISH_IMAGE_TONES
} from '../../config/dish-image.config';
import { DishImageSize } from '../../models/dish-image.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-dish-image',
  imports: [IconComponent],
  templateUrl: './dish-image.component.html',
  styleUrl: './dish-image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DishImageComponent {
  readonly name = input.required<string>();
  readonly size = input(DishImageSize.Default);
  readonly muted = input(false, { transform: booleanAttribute });

  protected readonly placeholderIcon = DISH_IMAGE_PLACEHOLDER_ICON;
  protected readonly tone = computed(() => this.getTone(this.name()));
  protected readonly iconSize = computed(() => DISH_IMAGE_ICON_SIZES[this.size()]);

  private getTone(name: string): string {
    const sum = [...name].reduce((total, char) => total + (char.codePointAt(0) ?? 0), 0);
    return DISH_IMAGE_TONES[sum % DISH_IMAGE_TONES.length] ?? DISH_IMAGE_TONES[0];
  }
}
