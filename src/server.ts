import express from "express";
import { setupVite } from "./framework/vite";
import { renderPage } from "./framework/ssr";
import { getPosts } from "./handlers";

const app = express();
const vite = await setupVite(app);

const components: Record<
  string,
  { path: string; fetcher?: () => Promise<unknown> }
> = {
  "/": {
    path: "pages/Home",
  },
  "/posts": {
    path: "pages/Posts",
    fetcher: getPosts,
  },
};

app.get("*", (req, res) => {
  const { path } = req;
  const route = components[path];
  const pathToComponent = route ? route.path : "components/App";
  renderPage(req, res, vite, pathToComponent, route?.fetcher);
});

app.listen(3000, () => console.log("http://localhost:3000"));
