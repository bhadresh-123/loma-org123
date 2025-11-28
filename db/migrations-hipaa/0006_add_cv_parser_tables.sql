-- Migration: Add CV Parser Tables for Credentialing
-- Created: 2025-10-28
-- Description: Adds tables to store parsed education and work experience from CVs

-- CV Parser Education Table
CREATE TABLE IF NOT EXISTS "cv_parser_education" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
  "university" TEXT NOT NULL,
  "degree" TEXT NOT NULL,
  "major" TEXT NOT NULL,
  "start_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "graduation_date" TIMESTAMP,
  "gpa" TEXT,
  "honors" TEXT,
  "is_verified" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- CV Parser Work Experience Table
CREATE TABLE IF NOT EXISTS "cv_parser_work_experience" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
  "organization" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "location" TEXT,
  "start_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "is_current" BOOLEAN DEFAULT false,
  "description" TEXT,
  "responsibilities" JSONB,
  "achievements" JSONB,
  "is_verified" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_cv_parser_education_user_id" ON "cv_parser_education"("user_id");
CREATE INDEX IF NOT EXISTS "idx_cv_parser_work_experience_user_id" ON "cv_parser_work_experience"("user_id");
CREATE INDEX IF NOT EXISTS "idx_cv_parser_education_start_date" ON "cv_parser_education"("start_date");
CREATE INDEX IF NOT EXISTS "idx_cv_parser_work_experience_start_date" ON "cv_parser_work_experience"("start_date");

-- Add comments for documentation
COMMENT ON TABLE "cv_parser_education" IS 'Stores education history parsed from CV uploads for credentialing purposes';
COMMENT ON TABLE "cv_parser_work_experience" IS 'Stores work experience parsed from CV uploads for credentialing purposes';

