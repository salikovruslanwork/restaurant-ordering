import type { ApiErrorCode } from './api-error-code.enum.js';
import type { CartChange } from './cart-change.model.js';

// message is always safe to show to the user
export type ApiError =
  | { code: ApiErrorCode.MenuChanged; message: string; changes: CartChange[] }
  | { code: ApiErrorCode.Validation; message: string; fields: Record<string, string[]> }
  | {
      code: Exclude<ApiErrorCode, ApiErrorCode.MenuChanged | ApiErrorCode.Validation>;
      message: string;
    };
