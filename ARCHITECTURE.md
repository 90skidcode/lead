# Architecture Overview

## Phase 0: Foundation

This document captures key architectural decisions made during Phase 0.

### Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript in strict mode
- **UI:** React 19 with Tailwind CSS
- **Database:** PostgreSQL via Supabase with Prisma ORM
- **Monorepo:** pnpm workspaces
- **Testing:** Vitest (unit/integration), React Testing Library, Playwright (E2E)
- **Offline:** PowerSync for local SQLite sync
- **Background Jobs:** Inngest
- **Email:** Resend
- **Mobile:** Capacitor wrapper (Phase 7)

### Monorepo Structure

```
apps/
  web/                  # Next.js web app (web + PWA + mobile shell)
  mobile/               # Capacitor project (Phase 7)

packages/
  db/                   # Prisma schema, migrations, RLS, seed scripts
  auth/                 # Session/auth types and helpers
  permissions/          # RBAC matrix and permission guards
  validation/           # Zod schemas (shared across forms, API, webhooks)
  types/                # Shared TypeScript interfaces
  config/               # Environment validation and constants
  powersync/            # PowerSync schema and sync rules
  ui/                   # Design system components (Phase 1+)
```

**Key Monorepo Rules:**
- Features are domain-organized. No feature folder imports internals from another feature.
- `packages/permissions` is the single source of truth for RBAC logic.
- `packages/validation` Zod schemas are reused everywhere (forms, server actions, API, webhooks).
- Build dependencies are explicit via `workspace:*` references in package.json.

### Database Design

#### Schema (Phase 0)
- `tenants` — Multi-tenant boundaries
- `users` — Global identity (not tenant-scoped)
- `tenant_users` — Membership join table with role and team assignment
- `teams` — Organizational units within a tenant
- `invitations` — User invitation lifecycle
- `audit_logs` — Append-only audit trail

#### IDs
- All primary keys are UUID (generated via `gen_random_uuid()`), never sequential integers.
- Provides better sharding and security posture at scale.

#### Indexing Strategy
- Composite indexes lead with `tenant_id` on every tenant-scoped table.
- Additional indexes on columns used in filtering/sorting (status, created_at, etc.).
- Example: `(tenant_id, status, created_at)` for efficient filtered list queries.

### Row-Level Security (RLS)

Every tenant-scoped table has RLS enabled with policies that enforce tenant isolation:

```sql
SELECT/INSERT/UPDATE/DELETE enforce:
  tenant_id = current_setting('app.current_tenant_id')::uuid
```

**Enforcement Flow:**
1. Middleware resolves session → user_id + validated tenant membership
2. Per-request, set `app.current_tenant_id` in the DB session
3. All queries filtered by tenant context at the DB layer
4. Application-level permission checks provide UX and early rejection; RLS is the final boundary

**RLS is the single source of truth for tenant isolation.** Application-level checks (via `packages/permissions`) can never be the sole defense.

### RBAC Model

**Roles (tenant-scoped):**
- `OWNER` — Full tenant control
- `ADMIN` — Tenant admin (all permissions except maybe tenant:manage)
- `MANAGER` — Team and report visibility
- `SALES_REP` — Own lead access
- `VIEWER` — Read-only

**Permissions:** Defined once in `packages/permissions`, referenced everywhere.
- Platform Super Admin (on `users.is_platform_super_admin`) is separate, non-tenant-scoped.

### Auth Scaffolding (Phase 1 details)

Session type defined in `packages/auth`:
```typescript
interface Session {
  userId: string;
  userEmail: string;
  tenantId: string;
  role: Role;
  isPlatformSuperAdmin: boolean;
  expiresAt: Date;
}
```

Full flows (signup, login, logout, password reset, email verification) are implemented in Phase 1.

### PowerSync Offline Sync (Phase 1+)

Schema defined in `packages/powersync`. Sync rules (which tables, which rows per tenant) are configured per phase as we add features.

Phase 0 includes a trivial `sync_test` table as a proof-of-concept that the infrastructure works.

### CI/CD

- **GitHub Actions** runs on push to main and all PRs
- **Pipeline:**
  1. Type check (`tsc --noEmit`)
  2. Lint (`eslint`)
  3. Unit/integration tests (`vitest`)
  4. E2E tests (`playwright`)
  5. Production build (`next build`)
- All jobs share a test PostgreSQL instance to verify RLS and migrations
- Tests must pass before main-branch code is deployed

### Environment Variables

All validated at app boot via `packages/config` with Zod schema. Fail fast if any are missing or invalid.
Never log secret values. See `.env.example` for baseline.

### Testing Strategy

- **Unit/Integration:** Vitest + React Testing Library (in `src/__tests__`)
- **E2E:** Playwright (in `tests/e2e`)
- **RLS/Security:** Integration tests in `packages/db/tests` that verify tenant isolation against real DB
- Tests run in CI on every push/PR. All tests must pass before merging.

### Security Boundaries

1. **Trust boundary:** User input (forms, API calls) must be validated via Zod schemas before processing.
2. **Tenant boundary:** Enforced via RLS at the database layer. No raw queries that bypass tenant context.
3. **Super Admin boundary:** `/admin/*` routes are structurally isolated. Super Admin can inspect, impersonate, manage tenants, but cannot directly edit tenant lead data.
4. **Session boundary:** Session tokens are httpOnly, secure cookies. Tenant selection is server-stored, not client-controlled.

### Known Limitations & Roadmap

- **Phase 0** delivers the foundation (schema, RLS, auth types, tooling, CI).
- **Phase 1** adds full auth flows, user management, tenant onboarding, and RBAC enforcement.
- **Phase 2** adds lead/contact/company CRUD and CSV import.
- **Phase 3** adds pipeline, activities, tasks, and Kanban.
- **Phase 4** adds automation, assignment, and notifications.
- **Phase 5** adds analytics and reporting.
- **Phase 6** adds custom fields, offline PWA support.
- **Phase 7** adds mobile app (Capacitor).
- **Phase 8** adds public API, webhooks, integrations, and production hardening.

### Future Considerations

- **Compliance:** Schema supports audit logging; GDPR/CCPA data export/deletion in Phase 8.
- **Scaling:** Indexes and query patterns designed for multi-tenant scale. PowerSync enables offline work. Reporting workloads separated from operational queries in Phase 5.
- **Extensibility:** Custom fields use JSONB, not dynamic schema. Automation engine uses Inngest for reliability and observability. API and webhooks use stable versioning.
