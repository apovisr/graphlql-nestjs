import { registerEnumType } from '@nestjs/graphql';

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  RETURNED = 'RETURNED',
}

registerEnumType(LoanStatus, {
  name: 'LoanStatus',
  description: 'Estado calculado a partir de las fechas del préstamo',
  valuesMap: {
    ACTIVE: { description: 'Prestado y dentro de plazo' },
    OVERDUE: { description: 'Prestado y fuera de plazo' },
    RETURNED: { description: 'Devuelto' },
  },
});
