import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';

import { of } from 'rxjs';

import { MOBILE_MEDIA_QUERY } from '../config/overlay.config';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  it('reports whether the mobile breakpoint matches', () => {
    const observe = vi.fn(() => of({ matches: true, breakpoints: {} }));
    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointObserver, useValue: { observe } }]
    });
    const values: boolean[] = [];

    TestBed.inject(LayoutService).isMobile$.subscribe((value) => values.push(value));

    expect(observe).toHaveBeenCalledWith(MOBILE_MEDIA_QUERY);
    expect(values).toEqual([true]);
    expect(TestBed.inject(LayoutService).isMobile()).toBe(true);
  });
});
