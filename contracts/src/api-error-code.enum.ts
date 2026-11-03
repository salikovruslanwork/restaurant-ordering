export enum ApiErrorCode {
  MenuChanged = 'MENU_CHANGED',
  VersionConflict = 'VERSION_CONFLICT',
  InvalidTransition = 'INVALID_TRANSITION',
  CategoryNotEmpty = 'CATEGORY_NOT_EMPTY',
  IdempotencyMismatch = 'IDEMPOTENCY_MISMATCH',
  Validation = 'VALIDATION',
  NotFound = 'NOT_FOUND',
  Internal = 'INTERNAL'
}
