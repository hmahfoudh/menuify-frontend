import { TenantResponse } from "./tenant.models";

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface RegisterRequest {
  email:    string;
  password: string;
  fullName: string;
  tenant:   TenantRequest;
}

export interface TenantRequest {
  slug:            string;
  subdomain:       string;
  name:            string;
  tagline?:        string;
  whatsappNumber?: string;
  city?:           string;
  currency?:       string;
  defaultLocale?:  string;
}

export interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  user:         UserResponse;
  tenant:       TenantResponse | null;
}

export interface UserResponse {
  id:        string;
  email:     string;
  fullName:  string;
  avatarUrl: string | null;
  role:      'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'VIEWER';
  createdAt: string;
}