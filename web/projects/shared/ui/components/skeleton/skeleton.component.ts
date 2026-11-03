import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SkeletonVariant } from '../../models/skeleton.model';

@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonComponent {
  readonly variant = input(SkeletonVariant.Line);
}
