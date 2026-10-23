import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts", "tools/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "tests/smoke/**"],
    setupFiles: ["tests/support/network-setup.ts"],
    allowOnly: false,
    testTimeout: 10_000,
    execArgv: ["--disable-warning=ExperimentalWarning"],
  },
});
