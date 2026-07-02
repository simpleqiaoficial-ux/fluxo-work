import { Prisma } from '@prisma/client';
import { calculateServiceOrderTotal } from './service-order-total.util';

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

describe('calculateServiceOrderTotal', () => {
  it('sums all value components', () => {
    const total = calculateServiceOrderTotal({
      baseValue: decimal(1000),
      bonus: decimal(100),
      commission: decimal(50),
      additionals: decimal(25),
      reimbursements: decimal(80),
      adjustments: decimal(0),
    });

    expect(total.toNumber()).toBe(1255);
  });

  it('allows negative adjustments to reduce the total', () => {
    const total = calculateServiceOrderTotal({
      baseValue: decimal(1000),
      bonus: decimal(0),
      commission: decimal(0),
      additionals: decimal(0),
      reimbursements: decimal(0),
      adjustments: decimal(-150),
    });

    expect(total.toNumber()).toBe(850);
  });

  it('keeps decimal precision instead of floating-point drift', () => {
    const total = calculateServiceOrderTotal({
      baseValue: decimal(10.1),
      bonus: decimal(0.2),
      commission: decimal(0),
      additionals: decimal(0),
      reimbursements: decimal(0),
      adjustments: decimal(0),
    });

    expect(total.toFixed(2)).toBe('10.30');
  });
});
