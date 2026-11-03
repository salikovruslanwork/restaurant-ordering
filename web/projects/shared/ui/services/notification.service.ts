import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Observable } from 'rxjs';

import { ERROR_NOTIFICATION_DURATION_MS, NOTIFICATION_DURATION_MS } from '../config/overlay.config';
import { NotificationKind, type NotificationOptions } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  // The returned stream emits when the user presses the action.
  show(message: string, options: NotificationOptions = {}): Observable<void> {
    const isError = options.kind === NotificationKind.Error;
    return this.snackBar
      .open(message, options.action, {
        duration: isError ? ERROR_NOTIFICATION_DURATION_MS : NOTIFICATION_DURATION_MS,
        politeness: isError ? 'assertive' : 'polite'
      })
      .onAction();
  }
}
