export type CashOperationType =
  | 'OPEN_FLOAT'
  | 'CASH_IN'
  | 'CASH_OUT'
  | 'SALE'
  | 'REFUND'
  | 'CLOSE_COUNT';
 
export interface CashDrawerState {
  open:            boolean;
  openingFloat:    number;
  expectedBalance: number;
  openedByName:    string | null;
  openedAt:        string | null;
  totalIn:         number;
  totalOut:        number;
}
 
export interface CashOperation {
  id:               string;
  type:             CashOperationType;
  amount:           number;
  reason:           string | null;
  orderReference:   string | null;
  performedByName:  string | null;
  balanceAfter:     number | null;
  expectedBalance:  number | null;  // CLOSE_COUNT only
  actualBalance:    number | null;  // CLOSE_COUNT only
  discrepancy:      number | null;  // CLOSE_COUNT only
  createdAt:        string;
}
 
export interface OpenDrawerRequest   { openingFloat: number; }
export interface CashMovementRequest { amount: number; reason: string; }
export interface CloseDrawerRequest  { actualCount: number; notes?: string; }
 
export const CASH_OP_LABEL: Record<CashOperationType, string> = {
  OPEN_FLOAT:  'Opening float',
  CASH_IN:     'Cash in',
  CASH_OUT:    'Cash out',
  SALE:        'Sale',
  REFUND:      'Refund',
  CLOSE_COUNT: 'Close count',
};
 
export const CASH_OP_DIRECTION: Record<CashOperationType, 'in' | 'out' | 'neutral'> = {
  OPEN_FLOAT:  'in',
  CASH_IN:     'in',
  SALE:        'in',
  CASH_OUT:    'out',
  REFUND:      'out',
  CLOSE_COUNT: 'neutral',
};
