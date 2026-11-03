import type { Observable } from 'rxjs';

export interface OverlayHandle<Result> {
  close(result?: Result): void;
  closed$: Observable<Result | undefined>;
}

export interface SheetOptions {
  data?: unknown;
}
