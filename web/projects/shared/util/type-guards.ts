import type { ApiError, EventEnvelope } from '@restaurant/contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// A proxy can answer instead of our server, so only the overall shape is checked.
export function isApiError(value: unknown): value is ApiError {
  return (
    isRecord(value) && typeof value['code'] === 'string' && typeof value['message'] === 'string'
  );
}

export function isEventEnvelope(value: unknown): value is EventEnvelope {
  return isRecord(value) && typeof value['seq'] === 'number' && isRecord(value['event']);
}
