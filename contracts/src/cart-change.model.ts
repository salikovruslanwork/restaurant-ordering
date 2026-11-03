import type { CartChangeKind } from './cart-change-kind.enum.js';
import type { Cents, Id } from './common.model.js';

export type CartChange =
  | { kind: CartChangeKind.PriceChanged; itemId: Id; oldPrice: Cents; newPrice: Cents }
  | { kind: CartChangeKind.Unavailable; itemId: Id }
  | { kind: CartChangeKind.Removed; itemId: Id }
  | { kind: CartChangeKind.DiscountTooHigh; maxDiscount: Cents };
