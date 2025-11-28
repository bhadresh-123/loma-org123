import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@db": "./db",
      "@db/schema": "./db/schema-hipaa-refactored.ts",
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./server/tests/setup-hipaa.ts"],
    include: [
      "server/tests/**/*.hipaa.test.ts",
      "server/tests/**/*.hipaa.spec.ts",
    ],
    exclude: [
      "node_modules",
      "dist",
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "server/services/HIPAAService.ts",
        "server/middleware/hipaa-middleware.ts",
        "server/routes/*-hipaa.ts",
        "db/schema-hipaa.ts"
      ],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/*.spec.ts"
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
});