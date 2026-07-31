-- CreateTable for tenant_settings
CREATE TABLE "tenant_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "date_format" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'en',
    "lead_defaults" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable for notification_preferences
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable for sync_statuses
CREATE TABLE "sync_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'synced',
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenant_id_user_id_event_type_key" ON "notification_preferences"("tenant_id", "user_id", "event_type");
CREATE INDEX "notification_preferences_tenant_id_user_id_idx" ON "notification_preferences"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sync_statuses_tenant_id_user_id_key" ON "sync_statuses"("tenant_id", "user_id");
CREATE INDEX "sync_statuses_tenant_id_status_idx" ON "sync_statuses"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_statuses" ADD CONSTRAINT "sync_statuses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_statuses" ADD CONSTRAINT "sync_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all new tables
ALTER TABLE "tenant_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_statuses" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_settings (admin read/write only)
CREATE POLICY tenant_settings_isolation_select ON "tenant_settings"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_settings_isolation_update ON "tenant_settings"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for notification_preferences (user-scoped)
CREATE POLICY notification_preferences_isolation_select ON "notification_preferences"
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND user_id = current_setting('app.current_user_id')::uuid
  );
CREATE POLICY notification_preferences_isolation_insert ON "notification_preferences"
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND user_id = current_setting('app.current_user_id')::uuid
  );
CREATE POLICY notification_preferences_isolation_update ON "notification_preferences"
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND user_id = current_setting('app.current_user_id')::uuid
  );

-- RLS Policies for sync_statuses (user-scoped)
CREATE POLICY sync_status_isolation_select ON "sync_statuses"
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND user_id = current_setting('app.current_user_id')::uuid
  );
CREATE POLICY sync_status_isolation_insert ON "sync_statuses"
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND user_id = current_setting('app.current_user_id')::uuid
  );
CREATE POLICY sync_status_isolation_update ON "sync_statuses"
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND user_id = current_setting('app.current_user_id')::uuid
  );
