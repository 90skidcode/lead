# Deployment Guide

Complete guide for deploying Lead Management SaaS to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GitHub repository with code pushed
- Vercel account (vercel.com)
- Supabase project (supabase.com)
- PowerSync instance (powersync.co) - optional for offline support
- Inngest account (inngest.com) - optional for background jobs
- Resend account (resend.com) - optional for email service

---

## Environment Setup

### 1. Create `.env.production.local` file

Copy `.env.example` and fill in production values:

```bash
cp .env.example .env.production.local
```

### 2. Required Environment Variables

```env
# Database (PostgreSQL via Supabase)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.REGION.supabase.co:5432/postgres?schema=public&sslmode=require
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@db.REGION.supabase.co:5432/postgres?schema=public&sslmode=require

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Session/Auth
SESSION_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Public URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Node environment
NODE_ENV=production
```

### 3. Optional but Recommended

```env
# PowerSync (offline-first sync)
POWERSYNC_URL=https://your-instance.powersync.co
POWERSYNC_TOKEN_SECRET=your-secret

# Inngest (background jobs)
INNGEST_EVENT_KEY=your-key
INNGEST_SIGNING_KEY=your-key

# Resend (email service)
RESEND_API_KEY=re_your_key
```

---

## Database Setup

### 1. Create Supabase Project

1. Go to supabase.com → New Project
2. Create PostgreSQL database
3. Note your connection string and keys

### 2. Run Migrations

```bash
# Using Prisma (local or CI/CD)
DATABASE_URL=<your-db-url> pnpm db:push

# Or manually in Supabase SQL Editor:
# Copy contents from packages/db/prisma/migrations/*/migration.sql
# Run each migration in order
```

### 3. Enable Row-Level Security (RLS)

All tables have RLS policies. Verify they're enabled:

```sql
-- In Supabase SQL Editor
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%';

-- For each table, RLS should be enabled
SELECT * FROM pg_class WHERE relname = 'leads' AND relrowsecurity = true;
```

### 4. Set Database Function for RLS Context

```sql
-- Create function to decode JWT and set context
CREATE OR REPLACE FUNCTION auth.jwt_claims() 
RETURNS jsonb AS $$
  SELECT 
    COALESCE(auth.jwt() -> 'app_metadata', '{}'::jsonb) ||
    COALESCE(auth.jwt() -> 'user_metadata', '{}'::jsonb)
$$ LANGUAGE sql STABLE;

-- Your middleware sets these headers:
-- x-tenant-id: tenant UUID
-- x-user-id: user UUID
-- x-user-role: OWNER|ADMIN|MANAGER|SALES_REP|VIEWER
```

---

## Vercel Deployment

### 1. Connect GitHub Repository

```bash
# Option A: CLI
npm i -g vercel
vercel login
vercel

# Option B: Web Dashboard
# vercel.com → New Project → Import Git Repository
```

### 2. Configure Environment Variables

In Vercel Dashboard:
- Project Settings → Environment Variables
- Add all variables from `.env.production.local`
- Set environment scope to `Production`, `Preview`, `Development` as needed

### 3. Configure Build Settings

Vercel auto-detects Next.js. Verify in Project Settings:

```
Framework: Next.js
Build Command: pnpm build
Install Command: pnpm install
Output Directory: apps/web/.next
```

Or create `vercel.json`:

```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```

### 4. Deploy

```bash
# Automatic: Push to main branch
git push origin main

# Manual: Via CLI
vercel --prod
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Check build logs in Vercel Dashboard
# Verify no TypeScript/lint errors

# Test endpoints
curl https://yourdomain.com/api/activities/stream
# Should return 401 (unauthorized) - expected

# Test login
# Navigate to https://yourdomain.com/login
# Create account and verify email
```

### 2. Database Health Check

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM audit_logs;

-- Verify RLS policies are active
SELECT * FROM pg_policies;
```

### 3. Monitor Activity

- Vercel: Project → Analytics
- Supabase: Database → Monitoring
- Vercel: Project → Logs (real-time logs)

### 4. Set Up Monitoring (Optional)

```bash
# View Vercel logs
vercel logs --prod

# Stream logs
vercel logs --prod --follow
```

---

## Troubleshooting

### Build Fails with TypeScript Errors

```bash
# Check locally
pnpm type-check
pnpm lint
pnpm build

# Fix issues locally, then push
git add .
git commit -m "fix: resolve build errors"
git push origin main
```

### Database Connection Errors

**Problem:** `Error: too many connections`

**Solution:**
- Use connection pooling in DATABASE_URL
- Supabase: Settings → Database → Connection pooling → Use pgBouncer
- Use pooling mode: `transaction` (recommended)

```env
DATABASE_URL=postgresql://postgres:password@db.REGION.supabase.co:6543/postgres?schema=public&sslmode=require
```

### RLS Policy Errors

**Problem:** `new row violates row-level security policy`

**Solution:** Ensure middleware sets tenant context:

```typescript
// src/middleware.ts should set:
response.headers.set('x-tenant-id', session.tenantId);
response.headers.set('x-user-id', session.userId);
response.headers.set('x-user-role', session.role);
```

### Session Expiration

**Problem:** Users logged out after 24 hours

**Solution:** Increase session TTL in auth:

```typescript
// packages/auth/src/index.ts
const JWT_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
```

### PowerSync Sync Failures

**Problem:** Offline data not syncing

**Solution:**
- Verify POWERSYNC_URL and POWERSYNC_TOKEN_SECRET
- Check PowerSync sync rules cover your tables
- Check client has internet connectivity
- Verify RLS allows service role access

### Email Not Sending

**Problem:** Notifications not delivered

**Solution:**
- Verify RESEND_API_KEY is set in Vercel
- Check Resend dashboard for bounces/errors
- Verify sender email is verified in Resend
- Check Inngest jobs are running

---

## Scaling Considerations

### Database

- Supabase auto-scales read replicas
- Monitor query performance: Supabase → Monitoring → Slow Queries
- Add indexes for frequently filtered columns (already done for Phase 0-7)

### Functions

- Vercel scales serverless automatically
- Monitor cold start time (should be <1s)
- Consider using Edge Functions for high-traffic routes

### Real-time Streaming

- SSE (/api/activities/stream) uses serverless functions
- For 1000+ concurrent users, consider dedicated WebSocket server
- Or use Supabase Realtime directly from client

### Caching

- Report snapshots cached for 1 hour (Phase 5)
- Static pages pre-rendered at build time
- Add CDN caching headers for static assets

---

## Rollback

If deployment has critical issues:

```bash
# Vercel automatically keeps previous deployments
# Via Vercel Dashboard: Project → Deployments → Select previous → Promote to Production

# Or via CLI
vercel rollback --prod
```

---

## Security Checklist

- [ ] DATABASE_URL uses `sslmode=require`
- [ ] SESSION_SECRET is 32+ random characters
- [ ] SUPABASE_SERVICE_ROLE_KEY never exposed to client
- [ ] VERCEL_ENV set to `production` for prod branch
- [ ] RLS policies verified on all tables
- [ ] Middleware sets tenant/user context for all requests
- [ ] CSRF protection enabled (Next.js default)
- [ ] CORS properly configured for API routes
- [ ] Rate limiting implemented for auth endpoints (optional)
- [ ] HTTPS enforced (Vercel default)

---

## Support

- Vercel: vercel.com/support
- Supabase: supabase.com/docs
- Next.js: nextjs.org/docs
