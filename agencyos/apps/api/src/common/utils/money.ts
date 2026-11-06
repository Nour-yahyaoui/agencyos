import { BadRequestException } from '@nestjs/common';
export interface LineInput { quantity: number; unitPrice: number | string; }
export function roundMoney(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }
export function calculateInvoice(items: LineInput[], taxRate: number) {
  if (!items.length) throw new BadRequestException('At least one invoice item is required');
  if (taxRate < 0 || taxRate > 100) throw new BadRequestException('Tax rate must be between 0 and 100');
  const lines = items.map((i) => {
    if (!Number.isInteger(i.quantity) || i.quantity <= 0) throw new BadRequestException('Quantity must be a positive integer');
    const price = Number(i.unitPrice);
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('Unit price must be a non-negative number');
    return { quantity: i.quantity, unitPrice: roundMoney(price), amount: roundMoney(i.quantity * price) };
  });
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  const taxAmount = roundMoney(subtotal * taxRate / 100);
  return { lines, subtotal, taxAmount, total: roundMoney(subtotal + taxAmount) };
}
export function toCents(amount: number | string) { return Math.round(Number(amount) * 100); }
