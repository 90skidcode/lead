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

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide including:

- Environment configuration for production
- Database setup and migrations
- Vercel deployment with environment variables
- Post-deployment verification and monitoring
- Troubleshooting common issues
- Scaling considerations
- Security checklist

**Quick Deploy to Vercel:**

1. Push code to GitHub
2. Connect repo at vercel.com
3. Set environment variables (see `.env.example` and `DEPLOYMENT.md`)
4. Run migrations: `pnpm db:push`
5. Deploy (automatic on git push)

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design decisions.

### Key Points

- **Monorepo:** Apps and packages organized by domain.
- **Multi-tenant:** Strict tenant isolation via PostgreSQL RLS.
- **Offline-first:** PowerSync enables local SQLite sync for offline lead operations.
- **Structured:** Domain-organized features, centralized RBAC and validation, append-only audit logs.

## Development Phases

✅ **Phase 0** — Foundation & Architecture
- Monorepo, database schema, RLS policies, auth scaffolding, dev tools setup

✅ **Phase 1** — Auth, Tenant Onboarding, RBAC & Super Admin
- Full auth flows, tenant onboarding, user invitations, team management, super admin impersonation

✅ **Phase 2** — Lead, Contact & Company Management
- CRUD operations, soft-delete tracking, custom fields, bulk operations, CSV imports

✅ **Phase 3** — Pipeline, Activities, Tasks & Sales Workflow
- Sales pipeline stages, activity logging, task management, note taking

✅ **Phase 4** — Automation, Assignment & Notifications
- Automation rules and triggers, lead assignment (manual/round-robin), real-time notifications

✅ **Phase 5** — Analytics, Dashboard & Reporting
- Report snapshots with caching, rep performance stats, pipeline funnel analysis, CSV exports

✅ **Phase 6** — Settings, Preferences & PWA Infrastructure
- Tenant settings (timezone, currency, branding), notification preferences, offline PWA manifest, service worker

✅ **Phase 7** — Real-time Collaboration & Activity Streaming
- Comment system with @mentions, presence awareness, Server-Sent Events for real-time updates

**42+ database tables** across all phases with strict tenant isolation, soft-delete audit trails, and production-grade RLS.

[See CLAUDE.md for full specifications.](./CLAUDE.md)

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
