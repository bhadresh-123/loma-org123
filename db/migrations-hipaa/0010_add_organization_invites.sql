-- Migration: Add organization_invites table to HIPAA schema
-- This migration creates the organization_invites table for secure email-based therapist invitations
-- This replaces the unsafe practice of showing all therapists in a dropdown

CREATE TABLE IF NOT EXISTS "organization_invites" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "invited_by" integer NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
  
  -- Invite details
  "email" text NOT NULL,
  "role" text NOT NULL,
  "token" text UNIQUE NOT NULL,
  
  -- Permissions that will be granted upon acceptance
  "can_view_all_patients" boolean DEFAULT false,
  "can_view_selected_patients" jsonb DEFAULT '[]'::jsonb,
  "can_view_all_calendars" boolean DEFAULT false,
  "can_view_selected_calendars" jsonb DEFAULT '[]'::jsonb,
  "can_manage_billing" boolean DEFAULT false,
  "can_manage_staff" boolean DEFAULT false,
  "can_manage_settings" boolean DEFAULT false,
  "can_create_patients" boolean DEFAULT true,
  
  -- Status
  "status" text DEFAULT 'pending',
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "accepted_by" integer REFERENCES "users_auth"("id"),
  
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_organization_invites_organization_id" ON "organization_invites"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_organization_invites_invited_by" ON "organization_invites"("invited_by");
CREATE INDEX IF NOT EXISTS "idx_organization_invites_email" ON "organization_invites"("email");
CREATE INDEX IF NOT EXISTS "idx_organization_invites_token" ON "organization_invites"("token");
CREATE INDEX IF NOT EXISTS "idx_organization_invites_status" ON "organization_invites"("status");
CREATE INDEX IF NOT EXISTS "idx_organization_invites_expires_at" ON "organization_invites"("expires_at");

-- Add table comment
COMMENT ON TABLE "organization_invites" IS 'Secure email-based invitations for therapists to join organizations. Replaces unsafe dropdown of all therapists.';

-- Add column comments for documentation
COMMENT ON COLUMN "organization_invites"."token" IS 'Secure unique token (64-byte hex string) used for invite acceptance';
COMMENT ON COLUMN "organization_invites"."status" IS 'Invite status: pending, accepted, expired, cancelled';
COMMENT ON COLUMN "organization_invites"."role" IS 'Role to be assigned: business_owner, admin, therapist, contractor_1099';
COMMENT ON COLUMN "organization_invites"."expires_at" IS 'Invite expiration date (typically 7 days from creation)';

