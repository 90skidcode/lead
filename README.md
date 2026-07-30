# Lead Management SaaS

A multi-tenant, offline-first lead management platform (CRM-lite) built with Next.js, PostgreSQL, Prisma, PowerSync, and Inngest.

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9.0.0+
- PostgreSQL 16+

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database and service credentials
   ```

3. **Initialize database:**
   ```bash
   cd packages/db
   pnpm migrate:dev
   pnpm generate
   cd ../..
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Testing

```bash
# Unit and integration tests
pnpm test

# E2E tests
pnpm test:e2e

# Test UI
pnpm test:ui
```

### Linting and Type Checking

```bash
pnpm lint
pnpm type-check
```

### Production Build

```bash
pnpm build
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design decisions.

### Key Points

- **Monorepo:** Apps and packages organized by domain.
- **Multi-tenant:** Strict tenant isolation via PostgreSQL RLS.
- **Offline-first:** PowerSync enables local SQLite sync for offline lead operations.
- **Structured:** Domain-organized features, centralized RBAC and validation, append-only audit logs.

## Development Phases

Phase 0 — ✅ **Foundation & Architecture** (current)
- [x] Monorepo structure
- [x] Database schema (tenants, users, tenant_users, teams, invitations, audit_logs)
- [x] RLS policies and tenant isolation tests
- [x] Auth scaffolding
- [x] PowerSync client setup
- [x] ESLint, Prettier, TypeScript strict, Vitest, RTL, Playwright, CI
- [x] ARCHITECTURE.md documentation

Phase 1 — Auth, Tenant Onboarding, RBAC, Super Admin (next)
- Full auth flows (signup, login, logout, password reset, email verification)
- Tenant onboarding pipeline
- User management and invitations
- Team management
- Super Admin features and impersonation

[See CLAUDE.md for full phase roadmap and specifications.](./CLAUDE.md)

## Project Structure

```
apps/web/              Next.js web app
packages/
  db/                  Prisma schema and migrations
  auth/                Session and auth types
  permissions/         RBAC permission matrix
  validation/          Shared Zod schemas
  types/               Shared TypeScript types
  config/              Environment validation
  powersync/           PowerSync schema and sync rules
```

## Contributing

All work follows the [Claude Code Workflow Protocol](./CLAUDE.md#9-claude-code-workflow-protocol).

## License

Proprietary — All rights reserved.
