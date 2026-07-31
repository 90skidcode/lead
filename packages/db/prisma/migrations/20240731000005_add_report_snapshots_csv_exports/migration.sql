-- CreateTable for report_snapshots
CREATE TABLE "report_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "report_type" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "data" JSONB NOT NULL DEFAULT '{}',
    "computed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable for csv_exports
CREATE TABLE "csv_exports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "export_type" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "file_url" TEXT,
    "error" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "csv_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_snapshots_tenant_id_report_type_params_key" ON "report_snapshots"("tenant_id", "report_type", "params");
CREATE INDEX "report_snapshots_tenant_id_report_type_idx" ON "report_snapshots"("tenant_id", "report_type");
CREATE INDEX "report_snapshots_computed_at_idx" ON "report_snapshots"("computed_at");

-- CreateIndex
CREATE INDEX "csv_exports_tenant_id_status_idx" ON "csv_exports"("tenant_id", "status");
CREATE INDEX "csv_exports_user_id_created_at_idx" ON "csv_exports"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_exports" ADD CONSTRAINT "csv_exports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "csv_exports" ADD CONSTRAINT "csv_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all new tables
ALTER TABLE "report_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "csv_exports" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_snapshots
CREATE POLICY report_snapshot_isolation_select ON "report_snapshots"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for csv_exports
CREATE POLICY csv_export_isolation_select ON "csv_exports"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY csv_export_isolation_insert ON "csv_exports"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY csv_export_isolation_update ON "csv_exports"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
