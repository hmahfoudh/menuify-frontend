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
  customDomain:    string | null;
  defaultLocale:   string;
  currencySymbol:  string;
  plan:            'STARTER' | 'STANDARD' | 'PREMIUM';
  active:          boolean;
  onTrial:         boolean;
  trialEndsAt:     string | null;
  createdAt:       string;
}
