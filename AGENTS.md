<!-- SPECKIT START -->

<!-- SPECKIT END -->

## Completed Features

### 001 - Project Scaffold (2026-07-29)

Full monorepo scaffold at the repository root with:

- Laravel 12.x backend at `apps/backend/` — PHP 8.2, Sanctum auth, Pest 3.x, PHPStan level 6, PSR-12 via Pint
- React 19 + Vite + TypeScript frontend at `apps/frontend/` — React Router 7, Axios, Bootstrap 5.3, Vitest, ESLint flat config
- Spec Kit v0.11.9 feature management (`.specify/`)
- OpenCode AI integration (`.opencode/`)
- Consistent JSON response envelope (`success`, `data`, `error`) via `AppServiceProvider` macros
- Health-check endpoint: `GET /api/health`
- CORS configuration
- Rate limiting (60/min for auth endpoints)

**Run backend tests**: `cd apps/backend && php artisan test`
**Run backend server**: `cd apps/backend && php artisan serve`
**Run frontend dev**: `cd apps/frontend && npm run dev`
**Run frontend tests**: `cd apps/frontend && npm test`
