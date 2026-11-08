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

/**
 * Stripe expresses amounts in the currency's smallest unit, which is not always 1/100.
 * Zero-decimal currencies (JPY, KRW, ...) are charged in whole units, and three-decimal
 * currencies (KWD, TND, ...) in thousandths that Stripe requires to be rounded to a multiple
 * of ten. Multiplying everything by 100 would overcharge a JPY invoice a hundredfold.
 * See https://docs.stripe.com/currencies#zero-decimal and #three-decimal.
 */
const ZERO_DECIMAL_CURRENCIES = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);
export function currencyExponent(currency: string) {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}
export function toMinorUnits(amount: number | string, currency: string) {
  const exponent = currencyExponent(currency);
  if (exponent === 0) return Math.round(Number(amount));
  // Stored amounts have two decimals; three-decimal currencies must end in 0 for Stripe.
  if (exponent === 3) return Math.round(Number(amount) * 100) * 10;
  return Math.round(Number(amount) * 100);
}
export function fromMinorUnits(minor: number, currency: string) { return minor / 10 ** currencyExponent(currency); }
