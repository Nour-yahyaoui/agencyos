import { calculateInvoice, roundMoney, toCents } from './money';
describe('money utilities', () => {
  it('calculates line amounts, subtotal, tax and total with cent rounding', () => {
    const r = calculateInvoice([{ quantity: 3, unitPrice: 19.99 }, { quantity: 1, unitPrice: 100 }], 8.25);
    expect(r.subtotal).toBe(159.97); expect(r.taxAmount).toBe(13.2); expect(r.total).toBe(173.17);
    expect(r.lines[0].amount).toBe(59.97);
  });
  it('rejects invalid quantities, prices and tax rates', () => {
    expect(() => calculateInvoice([], 0)).toThrow();
    expect(() => calculateInvoice([{ quantity: 0, unitPrice: 1 }], 0)).toThrow();
    expect(() => calculateInvoice([{ quantity: 1.5, unitPrice: 1 }], 0)).toThrow();
    expect(() => calculateInvoice([{ quantity: 1, unitPrice: -1 }], 0)).toThrow();
    expect(() => calculateInvoice([{ quantity: 1, unitPrice: 1 }], 101)).toThrow();
  });
  it('converts decimal amounts to integer cents for Stripe', () => { expect(toCents('21600.00')).toBe(2160000); expect(roundMoney(0.1 + 0.2)).toBe(0.3); });
});
