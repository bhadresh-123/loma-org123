-- Document Management Tables
-- Migration: 0005_add_documents_tables

-- Document Templates Table
-- Stores reusable templates for intake forms, consents, etc.
CREATE TABLE IF NOT EXISTS "document_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "category" text DEFAULT 'intake-docs',
  "organization_id" integer REFERENCES "organizations"("id") ON DELETE CASCADE,
  "is_active" boolean DEFAULT true,
  "version" integer DEFAULT 1,
  "created_by" integer REFERENCES "users_auth"("id"),
  "updated_by" integer REFERENCES "users_auth"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Patient Documents Table
-- Stores completed/signed documents with encrypted PHI content
CREATE TABLE IF NOT EXISTS "documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "patient_id" integer NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT,
  "template_id" integer REFERENCES "document_templates"("id") ON DELETE SET NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "content_encrypted" text,
  "file_url" text,
  "file_name" text,
  "file_mime_type" text,
  "status" text DEFAULT 'draft',
  "signed_at" timestamp,
  "signed_by" text,
  "created_by" integer NOT NULL REFERENCES "users_auth"("id"),
  "updated_by" integer REFERENCES "users_auth"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_document_templates_type" ON "document_templates"("type");
CREATE INDEX IF NOT EXISTS "idx_document_templates_org" ON "document_templates"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_document_templates_category" ON "document_templates"("category");

CREATE INDEX IF NOT EXISTS "idx_documents_patient" ON "documents"("patient_id");
CREATE INDEX IF NOT EXISTS "idx_documents_org" ON "documents"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_documents_type" ON "documents"("type");
CREATE INDEX IF NOT EXISTS "idx_documents_status" ON "documents"("status");
CREATE INDEX IF NOT EXISTS "idx_documents_created_at" ON "documents"("created_at");

-- Comments for documentation
COMMENT ON TABLE "document_templates" IS 'Reusable document templates for intake forms, consents, and other clinical documents';
COMMENT ON TABLE "documents" IS 'Patient-specific documents with encrypted PHI content';
COMMENT ON COLUMN "documents"."content_encrypted" IS 'AES-256-GCM encrypted document content containing PHI';

