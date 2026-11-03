import { ChangeDetectionStrategy, Component, inject, type Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';

import { Subject } from 'rxjs';

import { DIALOG_DATA, OVERLAY_SCRIM_CLASS, SHEET_PANEL_CLASS } from '../config/overlay.config';
import { DialogRef } from './dialog-ref';
import { SheetService } from './sheet.service';

@Component({
  selector: 'app-probe',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
class ProbeComponent {
  readonly ref = inject(DialogRef);
  readonly data = inject(DIALOG_DATA);
}

describe('SheetService', () => {
  const closed$ = new Subject<string | undefined>();
  const close = vi.fn();
  const open = vi.fn<
    (
      component: unknown,
      config: {
        injector: Injector;
        backdropClass: string;
        panelClass: string;
        autoFocus: string;
      }
    ) => unknown
  >(() => ({ close, closed: closed$ }));

  function openArguments() {
    const call = open.mock.lastCall;
    if (!call) throw new Error('Not opened');
    return call;
  }

  beforeEach(() => {
    open.mockClear();
    close.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: Dialog, useValue: { open } }]
    });
  });

  it('gives the opened component its data and ref, as a sheet with our scrim', () => {
    const ref = TestBed.inject(SheetService).open(ProbeComponent, { data: { id: 1 } });

    const [component, config] = openArguments();
    expect(component).toBe(ProbeComponent);
    expect(config.backdropClass).toBe(OVERLAY_SCRIM_CLASS);
    expect(config.panelClass).toBe(SHEET_PANEL_CLASS);
    expect(config.autoFocus).toBe('first-heading');
    expect(config.injector.get(DIALOG_DATA)).toEqual({ id: 1 });
    expect(config.injector.get(DialogRef)).toBe(ref);
  });

  it('returns a ref that closes the sheet and reports the result', () => {
    const ref = TestBed.inject(SheetService).open<string>(ProbeComponent);
    const closed = vi.fn();
    ref.closed$.subscribe(closed);

    ref.close('checkout');
    closed$.next('checkout');

    expect(close).toHaveBeenCalledExactlyOnceWith('checkout');
    expect(closed).toHaveBeenCalledExactlyOnceWith('checkout');
  });
});
