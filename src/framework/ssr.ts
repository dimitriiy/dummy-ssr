import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Request, Response } from "express";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ViteDevServer } from "vite";
import { buildHtml } from "./html";

const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveEntry(vite: ViteDevServer | null): string {
  if (!isProd) return "/src/entry-client.tsx";

  const manifest = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../../client/.vite/manifest.json"),
      "utf-8",
    ),
  );
  return "/" + manifest["src/entry-client.tsx"].file;
}

export async function renderPage(
  _req: Request,
  res: Response,
  vite: ViteDevServer | null,
  pathToComp: string,
  getInitialProps?: () => Promise<unknown>,
): Promise<void> {
  try {
    const mod = isProd
      ? await import(`../${pathToComp}`)
      : await vite!.ssrLoadModule(`/src/${pathToComp}.tsx`);

    // Support both default and named exports (e.g. export const Home, export const Posts)
    const Component = mod.default ?? Object.values(mod).find((v) => typeof v === "function");

    const initialProps = (await getInitialProps?.()) ?? {};

    const appHtml = ReactDOMServer.renderToString(
      React.createElement(Component as React.ComponentType<unknown>, initialProps),
    );

    const entry = resolveEntry(vite);
    res.send(buildHtml(appHtml, entry, initialProps, isProd));
  } catch (err) {
    vite?.ssrFixStacktrace(err as Error);
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}
