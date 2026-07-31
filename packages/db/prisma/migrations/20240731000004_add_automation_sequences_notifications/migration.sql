-- CreateTable for automation_rules
CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable for automation_runs
CREATE TABLE "automation_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable for lead_score_history
CREATE TABLE "lead_score_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "old_score" INTEGER NOT NULL,
    "new_score" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable for email_sequences
CREATE TABLE "email_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable for email_sequence_steps
CREATE TABLE "email_sequence_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable for email_sequence_enrollments
CREATE TABLE "email_sequence_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paused_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "email_sequence_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable for notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "lead_id" UUID,
    "task_id" UUID,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_rules_tenant_id_is_active_idx" ON "automation_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "automation_runs_tenant_id_status_idx" ON "automation_runs"("tenant_id", "status");
CREATE INDEX "automation_runs_rule_id_created_at_idx" ON "automation_runs"("rule_id", "created_at");

-- CreateIndex
CREATE INDEX "lead_score_history_tenant_id_lead_id_created_at_idx" ON "lead_score_history"("tenant_id", "lead_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_sequences_tenant_id_name_key" ON "email_sequences"("tenant_id", "name");
CREATE INDEX "email_sequences_tenant_id_idx" ON "email_sequences"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_sequence_steps_sequence_id_step_number_key" ON "email_sequence_steps"("sequence_id", "step_number");
CREATE INDEX "email_sequence_steps_sequence_id_idx" ON "email_sequence_steps"("sequence_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_sequence_enrollments_sequence_id_lead_id_key" ON "email_sequence_enrollments"("sequence_id", "lead_id");
CREATE INDEX "email_sequence_enrollments_sequence_id_status_idx" ON "email_sequence_enrollments"("sequence_id", "status");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_read_at_idx" ON "notifications"("tenant_id", "user_id", "read_at");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_score_history" ADD CONSTRAINT "lead_score_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_score_history" ADD CONSTRAINT "lead_score_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_sequence_steps" ADD CONSTRAINT "email_sequence_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "email_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "email_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all new tables
ALTER TABLE "automation_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_score_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_sequence_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_sequence_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_rules
CREATE POLICY automation_rule_isolation_select ON "automation_rules"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY automation_rule_isolation_insert ON "automation_rules"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY automation_rule_isolation_update ON "automation_rules"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY automation_rule_isolation_delete ON "automation_rules"
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for automation_runs
CREATE POLICY automation_run_isolation_select ON "automation_runs"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY automation_run_isolation_insert ON "automation_runs"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for lead_score_history
CREATE POLICY lead_score_history_isolation_select ON "lead_score_history"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY lead_score_history_isolation_insert ON "lead_score_history"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for email_sequences
CREATE POLICY email_sequence_isolation_select ON "email_sequences"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY email_sequence_isolation_insert ON "email_sequences"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY email_sequence_isolation_update ON "email_sequences"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policies for email_sequence_steps (inherit through sequence)
CREATE POLICY email_sequence_step_isolation_select ON "email_sequence_steps"
  FOR SELECT USING (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );
CREATE POLICY email_sequence_step_isolation_insert ON "email_sequence_steps"
  FOR INSERT WITH CHECK (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );

-- RLS Policies for email_sequence_enrollments
CREATE POLICY email_sequence_enrollment_isolation_select ON "email_sequence_enrollments"
  FOR SELECT USING (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );
CREATE POLICY email_sequence_enrollment_isolation_insert ON "email_sequence_enrollments"
  FOR INSERT WITH CHECK (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );
CREATE POLICY email_sequence_enrollment_isolation_update ON "email_sequence_enrollments"
  FOR UPDATE USING (
    sequence_id IN (
      SELECT id FROM email_sequences WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );

-- RLS Policies for notifications
CREATE POLICY notification_isolation_select ON "notifications"
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY notification_isolation_insert ON "notifications"
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY notification_isolation_update ON "notifications"
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
