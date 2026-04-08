# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Dev server at http://localhost:4200
npm run build          # Production build (SSR + prerender)
npm run watch          # Dev build with watch mode
npm test               # Unit tests via Karma/Jasmine
node dist/menuify-frontend/server/server.mjs  # Run SSR server after build
```

Generate components/services: `ng generate component|service|guard path/name`

## Architecture

**Angular 18** app with SSR (`@angular/ssr`), Tailwind CSS for layout, and `@ngx-translate` for i18n (default language: `fr`).

### Multi-context routing

The app serves three distinct contexts determined by subdomain (`SubdomainService`):

| Context | Subdomain pattern | Entry |
|---|---|---|
| Landing | `menuify.tn` or `www.*` | `/` → `LandingComponent` |
| Public menu | `<tenant>.menuify.tn` | `/menu` → `MenuPageComponent` |
| Dashboard | `app.*` / `dashboard.*` / `localhost` | `/dashboard` → `DashboardShellComponent` |

`SubdomainService.getContext()` is the single source of truth for which context is active. It also supports `?context=public|dashboard|landing` query params (for local dev).

### App initialization

`APP_INITIALIZER` (`src/app/core/initializers/app-initializer.ts`) runs before the app bootstraps. On public-menu subdomains it fetches `/api/menu` using a manually set `X-Tenant-Subdomain` header and caches tenant info (`PublicTenantInfo`) in localStorage.

### HTTP interceptors

Two functional interceptors are registered in `app.config.ts`:
- **`jwtInterceptor`** — attaches `Authorization: Bearer <token>` from localStorage
- **`tenantInterceptor`** — attaches `X-Tenant-Subdomain` header; reads subdomain from `AuthService.currentTenant()` in dashboard context, or from cached localStorage `tenant` key in public-menu context. Skips `/api/menu` and `/api/orders` (handled manually)

### Auth & guards

`AuthService` uses Angular signals for reactive auth state (`isLoggedIn`, `currentUser`, `currentTenant`). Session data is persisted to localStorage.

Guards:
- `authGuard` — checks JWT existence and expiry; does not check roles
- `ownerGuard` — ensures token type is `OWNER` (not staff), redirects staff to `/dashboard/pos`
- `superAdminGuard` — restricts `/admin` routes

### Feature structure

```
src/app/
├── core/
│   ├── guards/          # authGuard, ownerGuard, superAdminGuard
│   ├── initializers/    # APP_INITIALIZER (tenant bootstrap)
│   ├── interceptors/    # jwtInterceptor, tenantInterceptor
│   ├── models/          # api.models.ts, auth.models.ts, tenant.models.ts
│   └── services/        # AuthService, SubdomainService, LocalStorageService
├── features/
│   ├── landing/         # Marketing landing page
│   ├── public/          # Public customer-facing menu (menu-page)
│   ├── auth/            # Login, register pages
│   ├── dashboard/       # Owner dashboard (menu, orders, theme, analytics, qr, settings)
│   ├── pos/             # Point-of-sale system (staff login, cart, tables)
│   └── admin/           # Super-admin panel
└── shared/
    ├── components/      # email-verification-banner, impersonation-banner
    └── services/        # meta-tags.service.ts (SEO)
```

### POS system

POS has its own auth flow (`pos-auth.service.ts`) separate from owner auth, with a dedicated `pos-cart.service.ts` and `pos.service.ts`. POS routes are accessible at both `/pos` and `/dashboard/pos`.

### Environment

`src/environments/environment.ts` — `apiUrl` defaults to `http://localhost:8080` for dev, replaced with `environment.prod.ts` on `ng build`.

### SSR considerations

SSR is enabled (`prerender: true`). Code accessing `window`, `localStorage`, or `document` must guard with `isPlatformBrowser(PLATFORM_ID)`. Use `LocalStorageService` (which handles this) rather than calling `localStorage` directly.
