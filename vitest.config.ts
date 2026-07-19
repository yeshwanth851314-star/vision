import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 60000,
    include: ["tests/**/*.test.ts", "packages/**/*.test.ts", "apps/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", ".next", "**/*.d.ts"],
      thresholds: {
        statements: 70,
        branches: 55,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@visionos/shared": path.resolve(__dirname, "./packages/shared/src/index.ts"),
      "@visionos/ai-router": path.resolve(__dirname, "./packages/ai-router/src/index.ts"),
    },
  },
});
