import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Subject } from 'rxjs';

import { ERROR_NOTIFICATION_DURATION_MS, NOTIFICATION_DURATION_MS } from '../config/overlay.config';
import { NotificationKind } from '../models/notification.model';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const action$ = new Subject<void>();
  const open = vi.fn(() => ({ onAction: () => action$ }));

  beforeEach(() => {
    open.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { open } }]
    });
  });

  it('shows info politely by default', () => {
    TestBed.inject(NotificationService).show('Saved');

    expect(open).toHaveBeenCalledExactlyOnceWith('Saved', undefined, {
      duration: NOTIFICATION_DURATION_MS,
      politeness: 'polite'
    });
  });

  it('shows errors for longer and announces them at once', () => {
    TestBed.inject(NotificationService).show('Failed', {
      kind: NotificationKind.Error,
      action: 'Retry'
    });

    expect(open).toHaveBeenCalledExactlyOnceWith('Failed', 'Retry', {
      duration: ERROR_NOTIFICATION_DURATION_MS,
      politeness: 'assertive'
    });
  });

  it('reports the action being pressed', () => {
    const pressed = vi.fn();

    TestBed.inject(NotificationService).show('Failed', { action: 'Retry' }).subscribe(pressed);
    action$.next();

    expect(pressed).toHaveBeenCalledOnce();
  });
});
