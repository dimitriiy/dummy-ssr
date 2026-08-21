const DEV_PREAMBLE = `<script type="module">
  import RefreshRuntime from "/@react-refresh";
  RefreshRuntime.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => {};
  window.__vite_plugin_react_preamble_installed__ = true;
</script>`;

export function buildHtml(
  appHtml: string,
  entry: string,
  initialProps: unknown,
  isProd: boolean,
): string {
  console.log(appHtml, initialProps);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React SSR App</title>
    ${isProd ? "" : DEV_PREAMBLE}
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script>window.__INITIAL_PROPS__ = ${JSON.stringify(initialProps)};</script>
    <script type="module" src="${entry}"></script>
  </body>
</html>`;
}
