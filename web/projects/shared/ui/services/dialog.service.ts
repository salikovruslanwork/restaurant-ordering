import { inject, Injectable, Injector, type Type } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { filter, take, type Observable } from 'rxjs';

import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import {
  DIALOG_DATA,
  DIALOG_PANEL_CLASS,
  DIALOG_TITLE_ID,
  OVERLAY_SCRIM_CLASS
} from '../config/overlay.config';
import type { ConfirmDialogData } from '../models/confirm-dialog.model';
import { DialogSize, type DialogOptions } from '../models/dialog.model';
import { DialogRef } from './dialog-ref';

let nextTitleId = 0;

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);

  open<Result = unknown>(component: Type<unknown>, options: DialogOptions = {}): DialogRef<Result> {
    const ref = new DialogRef<Result>();
    const titleId = `dialog-title-${nextTitleId++}`;
    const opened = this.dialog.open<unknown, unknown, Result>(component, {
      panelClass: [DIALOG_PANEL_CLASS, `${DIALOG_PANEL_CLASS}--${options.size ?? DialogSize.Form}`],
      backdropClass: OVERLAY_SCRIM_CLASS,
      disableClose: options.disableClose ?? false,
      role: options.isAlert ? 'alertdialog' : 'dialog',
      ariaLabelledBy: titleId,
      injector: Injector.create({
        parent: this.injector,
        providers: [
          { provide: DialogRef, useValue: ref },
          { provide: DIALOG_DATA, useValue: options.data },
          { provide: DIALOG_TITLE_ID, useValue: titleId }
        ]
      })
    });
    ref.attach({
      close: (result) => opened.close(result),
      closed$: opened.afterClosed()
    });
    return ref;
  }

  // Opens at once; the stream emits only when the user confirms.
  confirm(data: ConfirmDialogData): Observable<true> {
    return this.open<boolean>(ConfirmDialogComponent, {
      data,
      size: DialogSize.Small,
      isAlert: true
    }).closed$.pipe(take(1), filter(Boolean));
  }
}
