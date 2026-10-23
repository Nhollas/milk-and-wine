import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/smoke/**/*.smoke.test.ts"],
    allowOnly: false,
    testTimeout: 15_000,
  },
});
