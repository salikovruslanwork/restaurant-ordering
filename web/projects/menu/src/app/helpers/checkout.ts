import {
  CartChangeKind,
  type CartChange,
  type Id,
  type MenuItem,
  type PlaceOrderRequest
} from '@restaurant/contracts';
import type { CartLine, CartLineView, CartState, CartSummary } from '@menu/models/cart.model';
import { CheckoutBlock, type CheckoutChange } from '@menu/models/checkout.model';

export function toOrderRequest(
  lines: CartLineView[],
  summary: CartSummary,
  items: Record<Id, MenuItem | undefined>
): PlaceOrderRequest | null {
  if (lines.length === 0 || summary.hasBlockedLines) {
    return null;
  }
  return {
    lines: lines.map((line) => ({
      itemId: line.itemId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      isOpenPrice: line.isCustomPrice,
      itemVersion: items[line.itemId]?.version ?? 1
    })),
    discount: summary.discount
  };
}

// The server compares the same fields to recognise a retry, so itemVersion doesn't count here.
export function isSameOrder(a: PlaceOrderRequest, b: PlaceOrderRequest): boolean {
  const essentials = (request: PlaceOrderRequest) =>
    JSON.stringify([
      request.discount,
      request.lines.map(({ itemId, quantity, unitPrice, isOpenPrice }) => [
        itemId,
        quantity,
        unitPrice,
        isOpenPrice
      ])
    ]);
  return essentials(a) === essentials(b);
}

// The connection doesn't block checkout: a failed attempt explains itself in the dialog.
export function getCheckoutBlock(summary: CartSummary): CheckoutBlock | null {
  if (summary.count === 0) {
    return CheckoutBlock.Empty;
  }
  return summary.hasBlockedLines ? CheckoutBlock.BlockedLines : null;
}

export function describeChanges(changes: CartChange[], cart: CartState): CheckoutChange[] {
  const nameOf = (itemId: Id) => cart.lines.find((line) => line.itemId === itemId)?.name ?? null;
  return changes.map((change) => {
    switch (change.kind) {
      case CartChangeKind.PriceChanged:
        return {
          kind: change.kind,
          name: nameOf(change.itemId),
          oldAmount: change.oldPrice,
          newAmount: change.newPrice
        };
      case CartChangeKind.DiscountTooHigh:
        return {
          kind: change.kind,
          name: null,
          oldAmount: cart.discount,
          newAmount: change.maxDiscount
        };
      default:
        return { kind: change.kind, name: nameOf(change.itemId), oldAmount: null, newAmount: null };
    }
  });
}

// What the server reported is applied to the cart, so the next attempt matches the menu.
export function applyChanges(cart: CartState, changes: CartChange[]): CartState {
  let { lines, discount } = cart;
  for (const change of changes) {
    switch (change.kind) {
      case CartChangeKind.PriceChanged:
        lines = lines.map((line) =>
          line.itemId === change.itemId && line.customPrice === null
            ? { ...line, seenPrice: change.newPrice }
            : line
        );
        break;
      case CartChangeKind.DiscountTooHigh:
        discount = Math.min(discount, change.maxDiscount);
        break;
      default:
        lines = lines.filter((line: CartLine) => line.itemId !== change.itemId);
    }
  }
  return { lines, discount };
}
