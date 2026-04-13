export interface DailyStatsResponse {
  date:            string;   // "2026-03-20"
  totalViews:      number;
  uniqueSessions:  number;
  qrScans:         number;
  totalOrders:     number;
  totalRevenue:    number;
  conversionRate:  number;
}

export interface AnalyticsSummaryResponse {
  // Current period
  totalViews:       number;
  uniqueVisitors:   number;
  qrScans:          number;
  totalOrders:      number;
  completedOrders:  number;
  totalRevenue:     number;
  averageOrderValue:number;
  conversionRate:   number;

  // Device breakdown
  mobileViews:  number;
  desktopViews: number;
  tabletViews:  number;

  // Previous period (for % change)
  prevTotalViews:   number;
  prevTotalOrders:  number;
  prevTotalRevenue: number;

  // Daily chart data
  dailyStats: DailyStatsResponse[];
}

export type Period = '7d' | '30d' | '90d';

export const PERIODS: { value: Period; label: string }[] = [
  { value: '7d',  label: 'Last 7 days'  },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

// Which field drives the chart
export type ChartMetric = 'totalViews' | 'totalOrders' | 'totalRevenue' | 'uniqueSessions';

export const CHART_METRICS: { value: ChartMetric; label: string }[] = [
  { value: 'totalViews',     label: 'Views'    },
  { value: 'uniqueSessions', label: 'Visitors' },
  { value: 'totalOrders',    label: 'Orders'   },
  { value: 'totalRevenue',   label: 'Revenue'  },
];