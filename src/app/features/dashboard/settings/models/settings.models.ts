export enum Feature { ORDER_TAKING= 'ORDER_TAKING', RESERVATION= 'RESERVATION', DELIVERY= 'DELIVERY' }

export interface TenantSettingsRequest {
  name?:             string;
  tagline?:          string;
  whatsappNumber?:   string;
  address?:          string;
  city?:             string;
  country?:          string;
  googleMapsUrl?:    string;
  facebookUrl?:      string;
  instagramUrl?:     string;
  twitterUrl?:       string;
  tiktokUrl?:        string;
  linkedinUrl?:      string;
  youtubeUrl?:       string;
  wifiName?:         string;
  wifiPassword?:     string;
  openingHours?:     string;   // JSON string
  defaultLocale?:    string;
  currencySymbol?:   string;
  googleAnalyticsId?:string;
  metaDescription?:  string;
  features? : Feature [];
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
  facebookUrl:     string | null;
  instagramUrl:    string | null;
  twitterUrl:      string | null;
  tiktokUrl:       string | null;
  linkedinUrl:     string | null;
  youtubeUrl:      string | null;
  wifiName:        string | null;
  wifiPassword:    string | null;
  openingHours:    string | null;
  customDomain:    string | null;
  customDomainVerified: boolean;
  defaultLocale:   string;
  currencySymbol:  string;
  metaDescription: string | null;
  googleAnalyticsId: string | null;
  plan:            'STARTER' | 'STANDARD' | 'PREMIUM';
  features? : Feature [];
  active:          boolean;
  onTrial:         boolean;
  trialEndsAt:     string | null;
  createdAt:       string;
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
  monday: { open: true,  from: '06:00', to: '23:00' },
  tuesday: { open: true,  from: '06:00', to: '23:00' },
  wednesday: { open: true,  from: '06:00', to: '23:00' },
  thursday: { open: true,  from: '06:00', to: '23:00' },
  friday: { open: true,  from: '06:00', to: '23:00' },
  saturday: { open: true,  from: '06:00', to: '00:00' },
  sunday: { open: false, from: '06:00', to: '23:00' },
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

export const FEATURES = [
  {
    id: Feature.ORDER_TAKING,
    label: 'Order taking',
    desc: 'Let customers add items to a cart and submit orders directly from the menu.',
    icon: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
    minPlan: 'STARTER',
  },
  {
    id: Feature.RESERVATION,
    label: 'Reservations',
    desc: 'Allow customers to book a table in advance from your menu page.',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    minPlan: 'STARTER',
  },
  {
    id: Feature.DELIVERY,
    label: 'Delivery',
    desc: 'Enable a delivery option on the cart so customers can request home delivery.',
    icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    minPlan: 'STARTER',
  },
]