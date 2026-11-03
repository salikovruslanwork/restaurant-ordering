export class FakeEventSource {
  static readonly CLOSED = 2;
  static instances: FakeEventSource[] = [];

  static get latest(): FakeEventSource {
    const latest = FakeEventSource.instances.at(-1);
    if (!latest) {
      throw new Error('No EventSource was created.');
    }
    return latest;
  }

  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data: unknown): void {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }

  fail(readyState: number): void {
    this.readyState = readyState;
    this.onerror?.();
  }
}
