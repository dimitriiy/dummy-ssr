import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ command }) => {
  const isSsr = command === "build" && process.env.SSR === "true";
  return {
    plugins: [react()],
    build: {
      manifest: !isSsr,
      outDir: isSsr ? "dist/server" : "dist/client",
      rollupOptions: isSsr
        ? {
            input: path.resolve("src/server.ts"),
            output: { format: "es", entryFileNames: "server.js" },
            external: (id) => !id.startsWith(".") && !id.startsWith("/"),
          }
        : { input: "src/entry-client.tsx" },
    },
  };
});
