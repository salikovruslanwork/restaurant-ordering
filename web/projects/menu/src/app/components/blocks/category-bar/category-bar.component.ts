import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Category, Id } from '@restaurant/contracts';
import { SkeletonComponent, SkeletonVariant } from '@shared/ui';
import { CATEGORY_SKELETON_CHIPS } from '@menu/config/menu.config';

@Component({
  selector: 'app-category-bar',
  imports: [SkeletonComponent],
  templateUrl: './category-bar.component.html',
  styleUrl: './category-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryBarComponent {
  readonly categories = input.required<Category[]>();
  readonly selectedId = input<Id | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });

  readonly selected = output<Id | null>();

  protected readonly SkeletonVariant = SkeletonVariant;
  protected readonly skeletons = Array.from({ length: CATEGORY_SKELETON_CHIPS }, (_, i) => i);
}
