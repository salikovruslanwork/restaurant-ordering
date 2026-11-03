import type { Cents } from '@restaurant/contracts';

export function lineTotal(unitPrice: Cents, quantity: number): Cents {
  return unitPrice * quantity;
}

export function subtotal(lines: readonly { unitPrice: Cents; quantity: number }[]): Cents {
  return lines.reduce((sum, line) => sum + lineTotal(line.unitPrice, line.quantity), 0);
}

export function capDiscount(discount: Cents, orderSubtotal: Cents): Cents {
  return Math.min(Math.max(0, discount), orderSubtotal);
}

export function orderTotal(orderSubtotal: Cents, discount: Cents): Cents {
  return orderSubtotal - capDiscount(discount, orderSubtotal);
}

// Reads the digits directly, because parseFloat('19.99') * 100 is 1998.9999999999998.
export function parseMoney(text: string): Cents | null {
  const normalized = text.replace(/[$\s]/g, '').replace(/,/g, '.');
  const match = normalized.match(/^(\d*)(?:\.(\d{0,2}))?$/);
  if (!match || (!match[1] && !match[2])) {
    return null;
  }
  return Number(match[1] || 0) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}
