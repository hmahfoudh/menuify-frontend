export interface CategorySalesRow {
  categoryName: string;
  itemCount:    number;
  revenue:      number;
}
 
export interface MethodSalesRow {
  method:  string;
  count:   number;
  revenue: number;
}
 
export interface ReportBody {
  tenantName:       string;
  tenantSlug:       string;
  openedAt:         string;
  closedAt:         string | null;
  openedByName:     string;
  closedByName:     string | null;
 
  totalOrders:      number;
  grossRevenue:     number;
  totalCashRevenue: number;
  totalCardRevenue: number;
  totalTips:        number;
  totalDiscounts:   number;
  totalRefunds:     number;
  netRevenue:       number;
 
  openingFloat:     number;
  expectedCash:     number;
  closingActual:    number;
  cashDiscrepancy:  number;
 
  byCategory:       CategorySalesRow[];
  byMethod:         MethodSalesRow[];
 
  generatedAt:      string;
  reportType:       'X' | 'Z';
  durationMinutes:  number | null;
}
 
export interface XReportResponse { shiftId: string; report: ReportBody; }
export interface ZReportResponse { shiftId: string; report: ReportBody; }
 
export interface ShiftSummaryRow {
  shiftId:         string;
  openedByName:    string;
  openedAt:        string;
  closedAt:        string | null;
  totalOrders:     number;
  netRevenue:      number;
  cashDiscrepancy: number | null;
}
 
export interface DailySummaryResponse {
  date:               string;
  shiftCount:         number;
  totalOrders:        number;
  grossRevenue:       number;
  totalCashRevenue:   number;
  totalCardRevenue:   number;
  totalTips:          number;
  totalDiscounts:     number;
  totalRefunds:       number;
  netRevenue:         number;
  totalDiscrepancy:   number;
  byCategory:         CategorySalesRow[];
  shifts:             ShiftSummaryRow[];
}
 
export interface DailyRevenueRow {
  date:       string;
  orders:     number;
  revenue:    number;
  refunds:    number;
  netRevenue: number;
}
 
export interface RangeSummaryResponse {
  from:               string;
  to:                 string;
  totalShifts:        number;
  totalOrders:        number;
  grossRevenue:       number;
  totalCashRevenue:   number;
  totalCardRevenue:   number;
  totalTips:          number;
  totalDiscounts:     number;
  totalRefunds:       number;
  netRevenue:         number;
  avgRevenuePerShift: number;
  avgOrdersPerShift:  number;
  dailyBreakdown:     DailyRevenueRow[];
}
 
/** Format a report amount for display: 185.500 DT */
export function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return amount.toFixed(3) + ' DT';
}
 
/** Discrepancy color — red if short, green if over, gray if zero */
export function discrepancyColor(discrepancy: number | null): string {
  if (discrepancy === null) return 'gray';
  if (discrepancy < 0) return 'red';
  if (discrepancy > 0) return 'green';
  return 'gray';
}
