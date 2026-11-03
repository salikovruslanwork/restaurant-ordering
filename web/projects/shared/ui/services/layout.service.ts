import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';

import { map, type Observable } from 'rxjs';

import { MOBILE_MEDIA_QUERY } from '../config/overlay.config';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly isMobile$: Observable<boolean> = this.breakpoints
    .observe(MOBILE_MEDIA_QUERY)
    .pipe(map(({ matches }) => matches));

  readonly isMobile = toSignal(this.isMobile$, { initialValue: false });
}
