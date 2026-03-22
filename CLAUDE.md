# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant SaaS POS (Point of Sale) system — Angular 21 frontend. Tenants are identified by subdomain (`tenant.osodreamer.lat`); in dev mode, `devSubdomain` from `environment.ts` is used. The backend is a NestJS API at `http://localhost:3000/api`.

## Commands

- `npm start` / `ng serve` — dev server on `http://localhost:4200`
- `ng build` — production build (outputs to `dist/`)
- `ng test` — run unit tests (Vitest via `@angular/build:unit-test`)
- No linter configured; Prettier is configured in `package.json` (100 char width, single quotes, Angular HTML parser)

## Architecture

### App Structure

```
src/app/
├── core/          # Singletons: services, guards, interceptors, layout, models
├── features/      # Feature modules (lazy-loaded routes)
│   ├── auth/      # Login, password recovery, branch selection
│   ├── inventory/ # Products, categories, brands, units, presentations, taxes, stock, suppliers, purchase orders
│   ├── configuracion/ # Settings (empresa-fiscal, branches, users)
│   ├── branches/  # Branch listing (currently used as dashboard)
│   ├── users/     # User management
│   └── error/     # Error pages (workspace-not-found)
└── shared/        # Reusable components, pipes, models
    ├── components/
    │   ├── auth-ui/   # Auth-specific components (card, input, button, branding)
    │   ├── list-ui/   # List page components (page-header, list-toolbar, data-card, pagination)
    │   └── ui/        # Generic UI (drawer, modal, toast, field-input, search-select, spinner, etc.)
    └── pipes/
```

### Key Patterns

- **Standalone components only** — no NgModules. All components use `standalone: true`.
- **Signals for state** — services use Angular signals (`signal()`, `computed()`) instead of BehaviorSubject. No NgRx.
- **Lazy loading** — all feature routes use `loadComponent` or `loadChildren` with dynamic imports.
- **Tenant interceptor** — `tenantInterceptor` adds `x-tenant-id` header to all HTTP requests. In production, extracted from subdomain; in dev, from `environment.devSubdomain`.
- **APP_INITIALIZER** — validates tenant existence and redirects to `/workspace-not-found` if invalid.
- **ChangeDetectionStrategy.OnPush** — used throughout.
- **Icons** — `@ng-icons/lucide` registered globally via `provideIcons()` in `app.config.ts`.

### Layout System (Atomic Design)

`core/layout/` follows atomic design: atoms (badge, icon) → molecules (nav-item, nav-group, workspace-switcher, user-profile) → organisms (sidebar, header) → templates (app-shell). The `AppShellComponent` wraps all authenticated routes.

### Services

Core services live in `core/services/` and are `providedIn: 'root'`. API base URL pattern: `${environment.apiUrl}/business/<resource>`. Feature-specific services (e.g., `product.service.ts`) live within their feature directory.

### Multi-tenant

- API calls include `x-tenant-id` header via interceptor
- `AuthService` handles tenant validation, login (two-step: credentials → branch selection), and session context
- `withCredentials: true` on all tenant-scoped requests

### Modal & Toast

- `ModalService` renders dynamic components inside a global `<app-modal>` using component references
- `ToastService` manages global notifications via `<app-toast>`

### Filtering

`QueryMapper` utility converts recursive `FilterGroup` trees to AG Grid-compatible filter models for backend queries.

### Styles

SCSS with `src/styles/` as include path (abstracts, base, components, utils). Components use inline SCSS or separate `.scss` files. Theme supports light/dark/system modes via `LayoutService`.

### Environment

- `src/environments/environment.ts` — dev defaults (`apiUrl`, `devSubdomain`)
- `src/environments/environment.production.ts` — production overrides (file replacement in angular.json)

### TypeScript

Strict mode enabled with Angular strict templates. Target ES2022.

## Conventions

- UI language is **Spanish** (routes, labels, breadcrumbs)
- Component files use either `.component.ts` suffix or flat naming (e.g., `sidebar.ts`) — both patterns coexist
- Backend controllers return data directly (no `{ data }` wrapper)
- Singleton endpoints (per-tenant) use routes without `:id` (e.g., PATCH `/fiscal` not `/fiscal/:id`)
- Use CSS variables from the theme system, not hardcoded colors
