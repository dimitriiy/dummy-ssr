import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { Express } from "express";
import { createServer, ViteDevServer } from "vite";

const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setupVite(app: Express): Promise<ViteDevServer | null> {
  if (!isProd) {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    return vite;
  }

  app.use(express.static(path.resolve(__dirname, "../../client")));
  return null;
}
