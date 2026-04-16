export type ShiftStatus = 'OPEN' | 'CLOSED';
 
export interface Shift {
  id:               string;
  status:           ShiftStatus;
 
  openedByName:     string;
  closedByName:     string | null;
 
  openedAt:         string;
  closedAt:         string | null;
 
  openingFloat:     number;
  closingActual:    number | null;
  closingExpected:  number | null;
  cashDiscrepancy:  number | null;
 
  // Live (open) or frozen (closed) totals
  totalOrders:      number | null;
  totalRevenue:     number | null;
  totalCashRevenue: number | null;
  totalCardRevenue: number | null;
  totalTips:        number | null;
  totalRefunds:     number | null;
  totalDiscounts:   number | null;
  netRevenue:       number | null;
 
  closingNotes:     string | null;
  durationMinutes:  number | null;
}
 
export interface OpenShiftRequest  { openingFloat: number; }
export interface CloseShiftRequest { actualCashCount: number; notes?: string; }
 
/** True if the discrepancy is significant (> 1 DT either way) */
export function hasSignificantDiscrepancy(shift: Shift): boolean {
  return shift.cashDiscrepancy !== null && Math.abs(shift.cashDiscrepancy) > 1;
}
 
/** Human-readable shift duration */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
