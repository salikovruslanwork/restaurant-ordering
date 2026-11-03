import { inject, Injectable, Injector, type Type } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';

import { DIALOG_DATA, OVERLAY_SCRIM_CLASS, SHEET_PANEL_CLASS } from '../config/overlay.config';
import type { SheetOptions } from '../models/overlay.model';
import { DialogRef } from './dialog-ref';

// Built on the CDK dialog, not MatBottomSheet: Material keeps phone sheets square and capped at 80vh.
@Injectable({ providedIn: 'root' })
export class SheetService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  open<Result = unknown>(component: Type<unknown>, options: SheetOptions = {}): DialogRef<Result> {
    const ref = new DialogRef<Result>();
    const opened = this.dialog.open<Result>(component, {
      autoFocus: 'first-heading',
      backdropClass: OVERLAY_SCRIM_CLASS,
      panelClass: SHEET_PANEL_CLASS,
      positionStrategy: this.overlay.position().global().left('0').bottom('0'),
      injector: Injector.create({
        parent: this.injector,
        providers: [
          { provide: DialogRef, useValue: ref },
          { provide: DIALOG_DATA, useValue: options.data }
        ]
      })
    });
    ref.attach({
      close: (result) => opened.close(result),
      closed$: opened.closed
    });
    return ref;
  }
}
