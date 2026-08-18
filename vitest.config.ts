import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` throws unless the `react-server` export condition is set,
      // which vitest's node environment does not set. The package ships an
      // empty module for exactly this case, which lets server modules be
      // unit-tested without pulling in a React Server Components runtime.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
