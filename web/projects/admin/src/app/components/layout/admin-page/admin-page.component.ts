import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AdminPageActionsDirective, AdminPageMetaDirective } from '@admin/slots/admin-page.slots';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPageComponent {
  readonly heading = input.required<string>();
}

export const ADMIN_PAGE = [
  AdminPageComponent,
  AdminPageMetaDirective,
  AdminPageActionsDirective
] as const;
