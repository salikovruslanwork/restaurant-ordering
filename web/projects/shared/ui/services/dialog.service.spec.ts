import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of } from 'rxjs';

import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import { DIALOG_DATA, DIALOG_TITLE_ID, OVERLAY_SCRIM_CLASS } from '../config/overlay.config';
import { DialogSize } from '../models/dialog.model';
import { DialogRef } from './dialog-ref';
import { DialogService } from './dialog.service';

@Component({
  selector: 'app-probe',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
class ProbeComponent {
  readonly ref = inject<DialogRef<string>>(DialogRef);
  readonly data = inject(DIALOG_DATA);
  readonly titleId = inject(DIALOG_TITLE_ID);
}

describe('DialogService', () => {
  let open: ReturnType<typeof vi.spyOn>;

  function config(): Parameters<MatDialog['open']>[1] {
    return open.mock.lastCall?.[1];
  }

  beforeEach(() => {
    open = vi.spyOn(TestBed.inject(MatDialog), 'open');
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  it('gives the opened component its data, ref and title id', () => {
    const ref = TestBed.inject(DialogService).open<string>(ProbeComponent, { data: { id: 1 } });

    const opened = TestBed.inject(MatDialog).openDialogs[0];
    const probe = opened?.componentInstance;
    if (!(probe instanceof ProbeComponent)) throw new Error('Not opened');
    expect(probe.data).toEqual({ id: 1 });
    expect(probe.ref).toBe(ref);
    expect(config()?.ariaLabelledBy).toBe(probe.titleId);
  });

  it('gives each dialog its own title id', () => {
    const service = TestBed.inject(DialogService);

    service.open(ProbeComponent);
    const first = config()?.ariaLabelledBy;
    service.open(ProbeComponent);

    expect(config()?.ariaLabelledBy).not.toBe(first);
  });

  it('returns a ref that closes the dialog and reports the result', async () => {
    const ref = TestBed.inject(DialogService).open<string>(ProbeComponent);
    const closed = vi.fn();
    ref.closed$.subscribe(closed);
    const finished = new Promise<void>((resolve) =>
      TestBed.inject(MatDialog).afterAllClosed.subscribe(() => resolve())
    );

    ref.close('saved');
    await finished;

    expect(closed).toHaveBeenCalledExactlyOnceWith('saved');
  });

  it.each(Object.values(DialogSize))('marks a %s dialog with its size class', (size) => {
    TestBed.inject(DialogService).open(ProbeComponent, { size });

    expect(config()?.panelClass).toEqual(['dialog-panel', `dialog-panel--${size}`]);
  });

  it('defaults to the form size', () => {
    TestBed.inject(DialogService).open(ProbeComponent);

    expect(config()?.panelClass).toEqual(['dialog-panel', 'dialog-panel--form']);
  });

  it('passes the options through, using our scrim', () => {
    TestBed.inject(DialogService).open(ProbeComponent, { disableClose: true, isAlert: true });

    expect(config()).toMatchObject({
      disableClose: true,
      role: 'alertdialog',
      backdropClass: OVERLAY_SCRIM_CLASS
    });
  });

  it.each([
    [true, [true]],
    [false, []],
    [undefined, []]
  ])('confirm opens a small alert and answers %j with %j', (answer, expected) => {
    const service = TestBed.inject(DialogService);
    const ref = new DialogRef<boolean>();
    ref.attach({ close: vi.fn(), closed$: of(answer) });
    const openDialog = vi.spyOn(service, 'open').mockReturnValue(ref);
    const data = { icon: 'help', title: 'Sure?', text: 'x', confirmLabel: 'Yes' };
    const answers: boolean[] = [];

    service.confirm(data).subscribe((value) => answers.push(value));

    expect(openDialog).toHaveBeenCalledWith(ConfirmDialogComponent, {
      data,
      size: DialogSize.Small,
      isAlert: true
    });
    expect(answers).toEqual(expected);
  });

  it('defaults to a closable dialog with the dialog role', () => {
    TestBed.inject(DialogService).open(ProbeComponent);

    expect(config()).toMatchObject({ disableClose: false, role: 'dialog' });
  });
});
