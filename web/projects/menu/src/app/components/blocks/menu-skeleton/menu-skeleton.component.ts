import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SkeletonComponent, SkeletonVariant } from '@shared/ui';
import { MENU_SKELETON_CARDS } from '@menu/config/menu.config';

@Component({
  selector: 'app-menu-skeleton',
  imports: [SkeletonComponent],
  templateUrl: './menu-skeleton.component.html',
  styleUrl: './menu-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuSkeletonComponent {
  protected readonly SkeletonVariant = SkeletonVariant;
  protected readonly cards = Array.from({ length: MENU_SKELETON_CARDS }, (_, i) => i);
}
