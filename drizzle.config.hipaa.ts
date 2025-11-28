import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load environment variables from .env file
config();

export default defineConfig({
  schema: "./db/schema-hipaa-refactored.ts",
  out: "./db/migrations-hipaa",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/loma_hipaa_dev",
  },
  verbose: true,
  strict: true,
});
