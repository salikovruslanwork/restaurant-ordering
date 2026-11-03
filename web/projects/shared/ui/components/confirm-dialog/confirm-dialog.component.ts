import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DIALOG_DATA } from '../../config/overlay.config';
import { ButtonVariant } from '../../models/button.model';
import type { ConfirmDialogData } from '../../models/confirm-dialog.model';
import { DialogSize, DialogTone } from '../../models/dialog.model';
import { DialogRef } from '../../services/dialog-ref';
import { ButtonComponent } from '../button/button.component';
import { DIALOG } from '../dialog/dialog.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [...DIALOG, ButtonComponent, IconComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly DialogSize = DialogSize;
  protected readonly tone = computed(() => this.getTone(this.data));
  protected readonly confirmVariant = this.data.isDanger
    ? ButtonVariant.Danger
    : ButtonVariant.Filled;

  protected answer(isConfirmed: boolean): void {
    this.ref.close(isConfirmed);
  }

  // A dialog with only one button reports something blocked, which is an error too.
  private getTone(data: ConfirmDialogData): DialogTone {
    return data.isDanger || !data.cancelLabel ? DialogTone.Error : DialogTone.Warning;
  }
}
