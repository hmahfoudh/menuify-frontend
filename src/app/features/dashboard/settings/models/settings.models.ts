export interface TenantSettingsRequest {
  name?:             string;
  tagline?:          string;
  whatsappNumber?:   string;
  address?:          string;
  city?:             string;
  country?:          string;
  googleMapsUrl?:    string;
  openingHours?:     string;   // JSON string
  defaultLocale?:    string;
  currencySymbol?:   string;
  googleAnalyticsId?:string;
  metaDescription?:  string;
}

export interface TenantResponse {
  id:              string;
  slug:            string;
  subdomain:       string;
  name:            string;
  tagline:         string | null;
  logoUrl:         string | null;
  whatsappNumber:  string | null;
  address:         string | null;
  city:            string | null;
  country:         string | null;
  googleMapsUrl:   string | null;
  openingHours:    string | null;
  customDomain:    string | null;
  customDomainVerified: boolean;
  defaultLocale:   string;
  currencySymbol:  string;
  metaDescription: string | null;
  googleAnalyticsId: string | null;
  plan:            'STARTER' | 'STANDARD' | 'PREMIUM';
  active:          boolean;
  onTrial:         boolean;
  trialEndsAt:     string | null;
  createdAt:       string;
}

export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
}

// Opening hours structure
export interface DayHours {
  open:   boolean;
  from:   string;   // "08:00"
  to:     string;   // "23:00"
}

export type WeekDay =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type OpeningHoursMap = Record<WeekDay, DayHours>;

export const DAY_LABELS: Record<WeekDay, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

export const DAYS: WeekDay[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export const DEFAULT_HOURS: OpeningHoursMap = {
  monday: { open: true,  from: '08:00', to: '23:00' },
  tuesday: { open: true,  from: '08:00', to: '23:00' },
  wednesday: { open: true,  from: '08:00', to: '23:00' },
  thursday: { open: true,  from: '08:00', to: '23:00' },
  friday: { open: true,  from: '08:00', to: '23:00' },
  saturday: { open: true,  from: '08:00', to: '00:00' },
  sunday: { open: false, from: '09:00', to: '22:00' },
};

export const LOCALES = [
  { value: 'fr', label: 'Français'  },
  { value: 'ar', label: 'العربية'   },
  { value: 'en', label: 'English'   },
];

export const CURRENCIES = [
  { value: 'DT', label: 'DT — Tunisian Dinar' },
  { value: '€',  label: '€ — Euro'            },
  { value: '$',  label: '$ — US Dollar'       },
  { value: 'MAD',label: 'MAD — Moroccan Dirham'},
];