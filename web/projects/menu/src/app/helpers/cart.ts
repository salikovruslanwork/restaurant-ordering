import {
  CartChangeKind,
  PricingKind,
  type Cents,
  type Id,
  type MenuItem
} from '@restaurant/contracts';
import { capDiscount, lineTotal } from '@shared/util';
import { MAX_QUANTITY } from '@menu/config/cart.config';
import type { CartLine, CartLineView, CartSummary } from '@menu/models/cart.model';

export function lineKey(itemId: Id, customPrice: Cents | null): string {
  return customPrice === null ? itemId : `${itemId}:${customPrice}`;
}

export function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(0, Math.round(quantity)));
}

// Flags come from the live menu, so they follow menu events by themselves. Before the menu has
// loaded (offline start), nothing is flagged and the price seen when adding is used.
export function lineIssue(line: CartLine, item: MenuItem | undefined): CartChangeKind | null {
  // A switch between fixed and open price has no kind of its own, so the line goes, as on the server.
  const isOpen = item?.pricing.kind === PricingKind.Open;
  if (!item || (line.customPrice !== null) !== isOpen) {
    return CartChangeKind.Removed;
  }
  if (!item.isAvailable) {
    return CartChangeKind.Unavailable;
  }
  const isPriceChanged =
    line.customPrice === null &&
    item.pricing.kind === PricingKind.Fixed &&
    item.pricing.price !== line.seenPrice;
  return isPriceChanged ? CartChangeKind.PriceChanged : null;
}

export function toLineViews(
  lines: CartLine[],
  items: Record<Id, MenuItem | undefined>,
  isMenuLoaded: boolean
): CartLineView[] {
  return lines.map((line) => {
    const item = items[line.itemId];
    const issue = isMenuLoaded ? lineIssue(line, item) : null;
    const currentPrice =
      item?.pricing.kind === PricingKind.Fixed ? item.pricing.price : line.seenPrice;
    const unitPrice =
      line.customPrice ?? (issue === CartChangeKind.Removed ? line.seenPrice : currentPrice);
    return {
      key: line.key,
      itemId: line.itemId,
      name: item?.name ?? line.name,
      quantity: line.quantity,
      seenPrice: line.seenPrice,
      unitPrice,
      lineTotal: lineTotal(unitPrice, line.quantity),
      isCustomPrice: line.customPrice !== null,
      issue,
      isBlocked: issue === CartChangeKind.Removed || issue === CartChangeKind.Unavailable
    };
  });
}

// Lines that can't be ordered stay visible but don't count towards the total.
export function toSummary(lines: CartLineView[], discount: Cents): CartSummary {
  const orderable = lines.filter(({ isBlocked }) => !isBlocked);
  const subtotal = orderable.reduce((sum, line) => sum + line.lineTotal, 0);
  const applied = capDiscount(discount, subtotal);
  return {
    count: lines.reduce((sum, { quantity }) => sum + quantity, 0),
    subtotal,
    discount: applied,
    total: subtotal - applied,
    isDiscountReduced: applied < discount,
    hasBlockedLines: orderable.length < lines.length
  };
}

// One entry per flagged line and flag, so a line that gets a different flag counts as new.
export function lineIssueKeys(lines: CartLineView[]): string[] {
  return lines.filter(({ issue }) => issue !== null).map(({ key, issue }) => `${key}:${issue}`);
}
