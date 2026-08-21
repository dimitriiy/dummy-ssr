import React from "react";
import ReactDOM from "react-dom/client";
import Home from "./pages/Home";
import Posts from "./pages/Posts";

declare global {
  interface Window {
    __INITIAL_PROPS__: any;
  }
}

const initialProps = window.__INITIAL_PROPS__;
const pathname = window.location.pathname;

const componentMap: Record<string, React.ComponentType<any>> = {
  "/": Home,
  "/posts": Posts,
};

const Component = componentMap[pathname] ?? Home;

ReactDOM.hydrateRoot(
  document.getElementById("root")!,
  <Component {...initialProps} />,
);
