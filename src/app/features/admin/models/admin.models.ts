export type Plan = 'STARTER' | 'STANDARD' | 'PREMIUM';

export interface AdminTenantResponse {
  id:                 string;
  name:               string;
  slug:               string;
  subdomain:          string;
  plan:               Plan;
  active:             boolean;

  ownerEmail:         string | null;
  ownerName:          string | null;
  ownerEmailVerified: boolean;

  onTrial:            boolean;
  trialExpired:       boolean;
  trialEndsAt:        string | null;
  daysRemaining:      number;   // negative = expired N days ago

  orderCount:         number;
  menuItemCount:      number;
  createdAt:          string;
}

export interface AdminStatsResponse {
  totalTenants:    number;
  activeTenants:   number;
  tenantsOnTrial:  number;
  expiredTrials:   number;
  totalOrders:     number;
  ordersToday:     number;
  totalMenuItems:  number;
}

export interface AdminCreateTenantRequest {
  restaurantName: string;
  slug:           string;
  subdomain:      string;
  ownerName:      string;
  ownerEmail:     string;
  ownerPassword:  string;
  plan:           Plan;
  trialDays:      number;
}

export const PLAN_META: Record<Plan, { label: string; color: string }> = {
  STARTER:  { label: 'Starter',  color: '#7a7268' },
  STANDARD: { label: 'Standard', color: '#5a9cf5' },
  PREMIUM:  { label: 'Premium',  color: '#c9a96e' },
};