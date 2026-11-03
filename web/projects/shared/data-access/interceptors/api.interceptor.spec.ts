import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ApiErrorCode } from '@restaurant/contracts';

import { CONNECTION_ERROR_MESSAGE, SERVER_ERROR_MESSAGE } from '../config/api.config';
import { RequestError, requestErrorMessage } from '../helpers/request-error';
import { connectionActions } from '../store/connection/connection.actions';
import { apiInterceptor } from './api.interceptor';

const URL = '/api/test';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let dispatch: ReturnType<typeof vi.spyOn>;
  let result: unknown;
  let failure: unknown;

  function failWithNoResponse(): void {
    controller.expectOne(URL).error(new ProgressEvent('error'), { status: 0 });
  }

  function respondWith(body: string | object, status: number): void {
    controller.expectOne(URL).flush(body, { status, statusText: 'Error' });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(1);
    result = undefined;
    failure = undefined;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideMockStore()
      ]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
  });

  afterEach(() => {
    controller.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function get(): void {
    http.get(URL).subscribe({
      next: (value) => (result = value),
      error: (error: unknown) => (failure = error)
    });
  }

  it('passes successful responses through', () => {
    get();

    respondWith({ ok: true }, 200);

    expect(result).toEqual({ ok: true });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('retries a GET with backoff when there is no response, then succeeds', () => {
    get();

    failWithNoResponse();
    controller.expectNone(URL);
    vi.advanceTimersByTime(1000);
    failWithNoResponse();
    vi.advanceTimersByTime(1999);
    controller.expectNone(URL);
    vi.advanceTimersByTime(1);
    respondWith({ ok: true }, 200);

    expect(result).toEqual({ ok: true });
    expect(failure).toBeUndefined();
  });

  it('reports every missing response to the connection state', () => {
    get();

    failWithNoResponse();

    expect(dispatch).toHaveBeenCalledWith(connectionActions.requestNoResponse());
  });

  it('gives up after 3 retries with a connection error', () => {
    get();

    failWithNoResponse();
    vi.advanceTimersByTime(1000);
    failWithNoResponse();
    vi.advanceTimersByTime(2000);
    failWithNoResponse();
    vi.advanceTimersByTime(4000);
    failWithNoResponse();

    expect(failure).toBeInstanceOf(RequestError);
    expect(failure).toMatchObject({
      status: 0,
      apiError: null,
      message: CONNECTION_ERROR_MESSAGE,
      isConnectionProblem: true
    });
  });

  it.each(['post', 'patch', 'delete'] as const)('does not retry a %s', (method) => {
    const request = method === 'delete' ? http.delete(URL) : http[method](URL, {});
    request.subscribe({ error: (error: unknown) => (failure = error) });

    failWithNoResponse();
    vi.advanceTimersByTime(60_000);

    controller.expectNone(URL);
    expect(failure).toMatchObject({ isConnectionProblem: true });
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it('does not retry a 5xx, and does not report it as a connection problem', () => {
    get();

    respondWith('<html>Bad gateway</html>', 502);
    vi.advanceTimersByTime(60_000);

    controller.expectNone(URL);
    expect(dispatch).not.toHaveBeenCalled();
    expect(failure).toMatchObject({
      status: 502,
      apiError: { code: ApiErrorCode.Internal, message: SERVER_ERROR_MESSAGE },
      message: SERVER_ERROR_MESSAGE,
      isConnectionProblem: false
    });
  });

  it('maps an ApiError body and keeps its message', () => {
    const apiError = { code: ApiErrorCode.VersionConflict, message: 'Updated by someone else' };
    get();

    respondWith(apiError, 409);

    expect(failure).toMatchObject({ status: 409, apiError, message: apiError.message });
    expect(failure).toMatchObject({ isConnectionProblem: false });
  });

  it('never shows the raw body of an error that is not an ApiError', () => {
    get();

    respondWith({ stack: 'secret' }, 500);

    expect(failure).toMatchObject({ message: SERVER_ERROR_MESSAGE });
  });

  describe('requestErrorMessage', () => {
    it('uses the message of a RequestError', () => {
      expect(requestErrorMessage(new RequestError(0, null, 'Offline'))).toBe('Offline');
    });

    it('falls back to a safe message', () => {
      expect(requestErrorMessage(new Error('secret'))).toBe(SERVER_ERROR_MESSAGE);
    });
  });
});
