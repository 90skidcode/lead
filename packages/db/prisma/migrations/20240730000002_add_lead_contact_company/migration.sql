-- CreateTable for companies
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable for contacts
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "company_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable for lead_sources
CREATE TABLE "lead_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_system_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable for tags
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable for leads
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "job_title" TEXT,
    "source_id" UUID,
    "company_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'new',
    "pipeline_id" UUID,
    "stage_id" UUID,
    "owner_user_id" UUID,
    "team_id" UUID,
    "score" INTEGER NOT NULL DEFAULT 0,
    "estimated_value" DOUBLE PRECISION,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "last_activity_at" TIMESTAMP(3),
    "next_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable for lead_contacts
CREATE TABLE "lead_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "relationship" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable for lead_tags
CREATE TABLE "lead_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable for custom_field_definitions
CREATE TABLE "custom_field_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "default_value" TEXT,
    "options" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable for custom_field_values
CREATE TABLE "custom_field_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "field_definition_id" UUID NOT NULL,
    "value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable for saved_views
CREATE TABLE "saved_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "columns" JSONB,
    "sort_by" TEXT,
    "sort_order" TEXT NOT NULL DEFAULT 'asc',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable for import_jobs
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "file_url" TEXT NOT NULL,
    "column_mapping" JSONB,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_tenant_id_idx" ON "companies"("tenant_id");
CREATE INDEX "companies_tenant_id_name_idx" ON "companies"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "contacts_tenant_id_idx" ON "contacts"("tenant_id");
CREATE INDEX "contacts_tenant_id_email_idx" ON "contacts"("tenant_id", "email");
CREATE INDEX "contacts_tenant_id_phone_idx" ON "contacts"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "lead_sources_tenant_id_idx" ON "lead_sources"("tenant_id");
CREATE UNIQUE INDEX "lead_sources_tenant_id_name_key" ON "lead_sources"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "tags_tenant_id_idx" ON "tags"("tenant_id");
CREATE UNIQUE INDEX "tags_tenant_id_name_key" ON "tags"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "leads_tenant_id_idx" ON "leads"("tenant_id");
CREATE INDEX "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");
CREATE INDEX "leads_tenant_id_owner_user_id_idx" ON "leads"("tenant_id", "owner_user_id");
CREATE INDEX "leads_tenant_id_team_id_idx" ON "leads"("tenant_id", "team_id");
CREATE INDEX "leads_tenant_id_deleted_at_idx" ON "leads"("tenant_id", "deleted_at");
CREATE INDEX "leads_tenant_id_created_at_idx" ON "leads"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "lead_contacts_tenant_id_idx" ON "lead_contacts"("tenant_id");
CREATE UNIQUE INDEX "lead_contacts_lead_id_contact_id_key" ON "lead_contacts"("lead_id", "contact_id");

-- CreateIndex
CREATE INDEX "lead_tags_tenant_id_idx" ON "lead_tags"("tenant_id");
CREATE UNIQUE INDEX "lead_tags_lead_id_tag_id_key" ON "lead_tags"("lead_id", "tag_id");

-- CreateIndex
CREATE INDEX "custom_field_definitions_tenant_id_idx" ON "custom_field_definitions"("tenant_id");
CREATE INDEX "custom_field_definitions_tenant_id_entity_type_idx" ON "custom_field_definitions"("tenant_id", "entity_type");
CREATE UNIQUE INDEX "custom_field_definitions_tenant_id_entity_type_key_key" ON "custom_field_definitions"("tenant_id", "entity_type", "key");

-- CreateIndex
CREATE INDEX "custom_field_values_tenant_id_idx" ON "custom_field_values"("tenant_id");
CREATE INDEX "custom_field_values_tenant_id_entity_type_entity_id_idx" ON "custom_field_values"("tenant_id", "entity_type", "entity_id");
CREATE UNIQUE INDEX "custom_field_values_entity_id_field_definition_id_key" ON "custom_field_values"("entity_id", "field_definition_id");

-- CreateIndex
CREATE INDEX "saved_views_tenant_id_user_id_idx" ON "saved_views"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "import_jobs_tenant_id_user_id_idx" ON "import_jobs"("tenant_id", "user_id");
CREATE INDEX "import_jobs_tenant_id_status_idx" ON "import_jobs"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_sources" ADD CONSTRAINT "lead_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "lead_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all new tenant-scoped tables
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_jobs" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY company_isolation_select ON "companies"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY company_isolation_insert ON "companies"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY company_isolation_update ON "companies"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY company_isolation_delete ON "companies"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for contacts
CREATE POLICY contact_isolation_select ON "contacts"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY contact_isolation_insert ON "contacts"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY contact_isolation_update ON "contacts"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY contact_isolation_delete ON "contacts"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for lead_sources
CREATE POLICY lead_source_isolation_select ON "lead_sources"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_source_isolation_insert ON "lead_sources"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for tags
CREATE POLICY tag_isolation_select ON "tags"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tag_isolation_insert ON "tags"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tag_isolation_update ON "tags"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tag_isolation_delete ON "tags"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for leads
CREATE POLICY lead_isolation_select ON "leads"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_isolation_insert ON "leads"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_isolation_update ON "leads"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_isolation_delete ON "leads"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for lead_contacts
CREATE POLICY lead_contact_isolation_select ON "lead_contacts"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_contact_isolation_insert ON "lead_contacts"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_contact_isolation_delete ON "lead_contacts"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for lead_tags
CREATE POLICY lead_tag_isolation_select ON "lead_tags"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_tag_isolation_insert ON "lead_tags"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_tag_isolation_delete ON "lead_tags"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for custom_field_definitions
CREATE POLICY custom_field_def_isolation_select ON "custom_field_definitions"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY custom_field_def_isolation_insert ON "custom_field_definitions"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY custom_field_def_isolation_update ON "custom_field_definitions"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for custom_field_values
CREATE POLICY custom_field_value_isolation_select ON "custom_field_values"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY custom_field_value_isolation_insert ON "custom_field_values"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY custom_field_value_isolation_update ON "custom_field_values"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for saved_views
CREATE POLICY saved_view_isolation_select ON "saved_views"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY saved_view_isolation_insert ON "saved_views"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY saved_view_isolation_update ON "saved_views"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY saved_view_isolation_delete ON "saved_views"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for import_jobs
CREATE POLICY import_job_isolation_select ON "import_jobs"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY import_job_isolation_insert ON "import_jobs"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY import_job_isolation_update ON "import_jobs"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
