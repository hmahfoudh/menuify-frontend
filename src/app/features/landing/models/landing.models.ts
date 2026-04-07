export type Lang = 'fr' | 'en' | 'ar';

export interface PublicTenant {
  id: string; name: string; subdomain: string;
  logoUrl: string | null; tagline: string | null; city: string | null;
}

export const FEATURE_ICONS: Record<string, string> = {
  menu:      'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  realtime:  'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  pos:       'M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M9 7h6',
  analytics: 'M18 20V10M12 20V4M6 20v-6',
  qr:        'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2M19 15v2M15 19h2v2M19 21h2M21 17h-2',
  theme:     'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
};

export const FEATURE_KEYS = Object.keys(FEATURE_ICONS);

export const PLANS = [
  { key: 'starter',  popular: false },
  { key: 'standard', popular: true  },
  { key: 'premium',  popular: false },
];