import { of } from 'rxjs';

import { DialogRef } from './dialog-ref';

describe('DialogRef', () => {
  it('does nothing before it is attached', () => {
    const ref = new DialogRef<string>();
    const completed = vi.fn();

    ref.close('ignored');
    ref.closed$.subscribe({ complete: completed });

    expect(completed).toHaveBeenCalledOnce();
  });

  it('forwards to the attached overlay', () => {
    const ref = new DialogRef<string>();
    const close = vi.fn();
    const closed = vi.fn();
    ref.attach({ close, closed$: of('done') });

    ref.close('result');
    ref.closed$.subscribe(closed);

    expect(close).toHaveBeenCalledExactlyOnceWith('result');
    expect(closed).toHaveBeenCalledExactlyOnceWith('done');
  });
});
