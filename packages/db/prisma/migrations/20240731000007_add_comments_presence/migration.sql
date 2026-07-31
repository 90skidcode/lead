-- CreateTable for comments (with mention support)
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable for user_presences (presence awareness)
CREATE TABLE "user_presences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "viewing_entity_type" TEXT,
    "viewing_entity_id" UUID,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comments_tenant_id_lead_id_deleted_at_idx" ON "comments"("tenant_id", "lead_id", "deleted_at");
CREATE INDEX "comments_tenant_id_author_user_id_created_at_idx" ON "comments"("tenant_id", "author_user_id", "created_at");
CREATE INDEX "comments_tenant_id_created_at_idx" ON "comments"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_presences_tenant_id_user_id_key" ON "user_presences"("tenant_id", "user_id");
CREATE INDEX "user_presences_tenant_id_viewing_entity_type_viewing_entity_id_idx" ON "user_presences"("tenant_id", "viewing_entity_type", "viewing_entity_id");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presences" ADD CONSTRAINT "user_presences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_presences" ADD CONSTRAINT "user_presences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all new tables
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_presences" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments (tenant-scoped, soft-delete aware)
CREATE POLICY comments_isolation_select ON "comments"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY comments_isolation_insert ON "comments"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY comments_isolation_update ON "comments"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid AND author_user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY comments_isolation_delete ON "comments"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid AND author_user_id = current_setting('app.current_user_id')::uuid);

-- RLS Policies for user_presences (user-scoped)
CREATE POLICY user_presences_isolation_select ON "user_presences"
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );
CREATE POLICY user_presences_isolation_insert ON "user_presences"
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND user_id = current_setting('app.current_user_id')::uuid
  );
CREATE POLICY user_presences_isolation_update ON "user_presences"
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND user_id = current_setting('app.current_user_id')::uuid
  );
