import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output
} from '@angular/core';

import { DIALOG_TITLE_ID } from '../../config/overlay.config';
import { ButtonVariant } from '../../models/button.model';
import { DialogSize, DialogTone } from '../../models/dialog.model';
import {
  DialogActionsDirective,
  DialogContentDirective,
  DialogIconDirective,
  DialogTitleDirective
} from '../../slots/dialog.slots';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-dialog',
  imports: [ButtonComponent],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogComponent {
  readonly size = input(DialogSize.Form);
  readonly heroTone = input<DialogTone | null>(null);
  readonly closeDisabled = input(false, { transform: booleanAttribute });
  readonly closeRequested = output();

  protected readonly ButtonVariant = ButtonVariant;
  protected readonly titleId = inject(DIALOG_TITLE_ID, { optional: true });
}

export const DIALOG = [
  DialogComponent,
  DialogTitleDirective,
  DialogIconDirective,
  DialogContentDirective,
  DialogActionsDirective
] as const;
