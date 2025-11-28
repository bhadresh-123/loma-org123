-- Migration: Add tasks table to HIPAA schema
-- This migration creates the missing tasks table that supports task management functionality

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "created_by_user_id" integer NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
  "assigned_to_user_id" integer REFERENCES "users_auth"("id") ON DELETE SET NULL,
  "patient_id" integer REFERENCES "patients"("id") ON DELETE CASCADE,
  "session_id" integer REFERENCES "clinical_sessions"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'pending',
  "priority" text DEFAULT 'medium',
  "type" text DEFAULT 'general',
  "category_id" integer,
  "client_id" integer,
  "is_automated" boolean DEFAULT false,
  "due_date" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_tasks_organization_id" ON "tasks"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_created_by_user_id" ON "tasks"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_to_user_id" ON "tasks"("assigned_to_user_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_patient_id" ON "tasks"("patient_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_session_id" ON "tasks"("session_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks"("status");
CREATE INDEX IF NOT EXISTS "idx_tasks_priority" ON "tasks"("priority");
CREATE INDEX IF NOT EXISTS "idx_tasks_type" ON "tasks"("type");
CREATE INDEX IF NOT EXISTS "idx_tasks_due_date" ON "tasks"("due_date");
CREATE INDEX IF NOT EXISTS "idx_tasks_created_at" ON "tasks"("created_at" DESC);

-- Add table comment
COMMENT ON TABLE "tasks" IS 'Task management for clinical sessions, invoices, and general workflow';

-- Add column comments for documentation
COMMENT ON COLUMN "tasks"."type" IS 'Task type: general, session_note, intake_document, invoice';
COMMENT ON COLUMN "tasks"."is_automated" IS 'Whether this task was automatically created by the system';
COMMENT ON COLUMN "tasks"."status" IS 'Task status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN "tasks"."priority" IS 'Task priority: low, medium, high, urgent';

