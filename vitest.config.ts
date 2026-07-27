import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "src/**/*.test.ts"],
    // Unit tests never touch a real database or real secrets.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/subiq_test",
    },
  },
});
