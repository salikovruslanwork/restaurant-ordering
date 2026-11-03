import { defer, EMPTY } from 'rxjs';

import type { OverlayHandle } from '../models/overlay.model';

// Created before the overlay opens, so the opened component can inject it.
export class DialogRef<Result = unknown> {
  private handle: OverlayHandle<Result> | null = null;

  readonly closed$ = defer(() => this.handle?.closed$ ?? EMPTY);

  attach(handle: OverlayHandle<Result>): void {
    this.handle = handle;
  }

  close(result?: Result): void {
    this.handle?.close(result);
  }
}
