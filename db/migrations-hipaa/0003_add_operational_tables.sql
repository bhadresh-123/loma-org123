-- Migration: Add operational tables to HIPAA schema
-- This migration adds the missing operational tables that support the application's functionality
-- but were not included in the initial HIPAA migration.

-- Add user settings table
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users_auth"("id") ON DELETE CASCADE,
  "auto_create_session_note_tasks" boolean DEFAULT true,
  "auto_create_intake_document_tasks" boolean DEFAULT true,
  "auto_create_invoice_tasks" boolean DEFAULT true,
  "auto_resolve_completed_tasks" boolean DEFAULT true,
  "email_notifications_enabled" boolean DEFAULT true,
  "sms_notifications_enabled" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "message" text,
  "type" text NOT NULL,
  "entity_id" integer,
  "entity_type" text,
  "is_read" boolean DEFAULT false,
  "is_automated" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

-- Add notification settings table
CREATE TABLE IF NOT EXISTS "notification_settings" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users_auth"("id") ON DELETE CASCADE,
  "session_reminder" boolean DEFAULT true,
  "task_automation" boolean DEFAULT true,
  "task_completed" boolean DEFAULT true,
  "document_uploaded" boolean DEFAULT true,
  "invoice_generated" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
  "patient_id" integer NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "invoice_number" text NOT NULL,
  "status" text NOT NULL,
  "due_date" timestamp,
  "subtotal" numeric(10, 2) NOT NULL,
  "tax" numeric(10, 2) DEFAULT 0,
  "total" numeric(10, 2) NOT NULL,
  "notes" text,
  "stripe_invoice_id" text,
  "stripe_customer_id" text,
  "stripe_connect_account_id" text,
  "stripe_hosted_url" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add invoice items table
CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" serial PRIMARY KEY,
  "invoice_id" integer NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "session_id" integer REFERENCES "clinical_sessions"("id") ON DELETE SET NULL,
  "description" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price" numeric(10, 2) NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Add card transactions table
CREATE TABLE IF NOT EXISTS "card_transactions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
  "stripe_transaction_id" text NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "currency" text DEFAULT 'usd',
  "status" text NOT NULL,
  "last4" text,
  "brand" text,
  "description" text,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_entity" ON "notifications"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications"("is_read");

CREATE INDEX IF NOT EXISTS "idx_invoices_user_id" ON "invoices"("user_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_patient_id" ON "invoices"("patient_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "idx_invoices_due_date" ON "invoices"("due_date");

CREATE INDEX IF NOT EXISTS "idx_invoice_items_invoice_id" ON "invoice_items"("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_invoice_items_session_id" ON "invoice_items"("session_id");

CREATE INDEX IF NOT EXISTS "idx_card_transactions_user_id" ON "card_transactions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_card_transactions_stripe_id" ON "card_transactions"("stripe_transaction_id");
CREATE INDEX IF NOT EXISTS "idx_card_transactions_status" ON "card_transactions"("status");

-- Add comments for documentation
COMMENT ON TABLE "user_settings" IS 'User preferences for task automation and notifications';
COMMENT ON TABLE "notifications" IS 'User notifications and system alerts';
COMMENT ON TABLE "notification_settings" IS 'User notification preferences by type';
COMMENT ON TABLE "invoices" IS 'Billing invoices for patients';
COMMENT ON TABLE "invoice_items" IS 'Individual line items for invoices';
COMMENT ON TABLE "card_transactions" IS 'Stripe card transaction records';
