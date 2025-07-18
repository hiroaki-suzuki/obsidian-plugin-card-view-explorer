/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/test/**",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.d.ts",
        "src/**/*.css.ts", // Vanilla Extract CSS files
        "src/types/**/*.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
      obsidian: "/src/test/obsidian-mock.ts",
    },
  },
  define: {
    global: "globalThis",
  },
});
