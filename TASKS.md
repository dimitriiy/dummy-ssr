# SSR Tasks

---

## Task 4 — Routing (2 этапа)

### Теория

**Проблема без роутинга:**
Один компонент на все URL. Сервер не знает какую страницу рендерить. Клиент не знает какой компонент гидрировать.

**Этап 1 — Server-side routing (MPA):**
```
GET /       → сервер рендерит Home
GET /posts  → сервер рендерит Posts
Переходы    → полная перезагрузка страницы (<a href>)
```

**Этап 2 — Client-side routing (SPA-переходы):**
```
defineRoutes([{ path: "/", component: Home }, ...])
<Link href="/posts"> → history.pushState → перерисовка без reload
popstate → восстановление при back/forward
```

**Ключевые проблемы:**

- Сервер и клиент должны использовать одну таблицу маршрутов
- Клиент при гидрации должен знать какой компонент рендерить (по `window.location.pathname`)
- `getServerProps` — данные prefetch на сервере, передаются через `__INITIAL_PROPS__`

```
Server:  match(req.path, routes) → { component, getServerProps }
                                 → renderPage(component, await getServerProps())

Client:  match(location.pathname, routes) → hydrateRoot(component, __INITIAL_PROPS__)
         popstate / pushState → match → re-render (без SSR)
```

---

### Этап 1 — Простой роутинг

**Нужно сделать:**

1. Создать `src/pages/Home.tsx` — заголовок "Home", ссылка на `/posts`

2. Создать `src/pages/Posts.tsx` — список постов (логика из `App.tsx`), ссылка на `/`

3. Изменить `src/framework/ssr.ts` — `renderPage` принимает путь к модулю страницы явно, а не хардкод `App`

4. Изменить `src/server.ts`:
   - `GET /` → рендер `Home`, без `getInitialProps`
   - `GET /posts` → рендер `Posts`, `getInitialProps = getPosts`
   - Убрать `POST /posts`

5. Изменить `src/entry-client.tsx` — switch по `window.location.pathname` → гидрация нужного компонента

**Что проверить:**

- `GET /` → HTML с заголовком "Home", ссылка на `/posts`
- `GET /posts` → HTML со списком постов, данные уже в HTML (SSR)
- Клик по ссылке → полная перезагрузка, гидрация нужного компонента
- `view-source` на `/posts` → посты в HTML, не загружаются JS'ом

---

### Этап 2 — Router как framework-примитив (SPA-переходы)

**Нужно сделать:**

1. Создать `src/framework/router.ts` — типы `Route`, функции `defineRoutes` и `matchRoute`

2. Создать `src/framework/Link.tsx` — компонент `<Link href>` с `history.pushState` без перезагрузки страницы

3. Создать `src/routes.ts` — таблица маршрутов приложения, использует `defineRoutes`

4. Изменить `src/framework/ssr.ts` — матчинг маршрута по `req.path` через таблицу маршрутов

5. Изменить `src/server.ts` — один `app.get("*")`, роутинг делегируется в `ssr.ts`

6. Изменить `src/entry-client.tsx` — слушает `popstate`, матчит маршрут, перерисовывает компонент без reload; заменить `<a href>` в страницах на `<Link>`

**Что проверить:**

- Клик по `<Link href="/posts">` — URL меняется, страница **не перезагружается**
- `back/forward` в браузере — работает через `popstate`
- `view-source` на `/posts` — данные всё ещё в HTML (SSR не сломан)
- `F5` на `/posts` — корректный SSR + гидрация

---

## Task 2 — Data Fetching + Dehydration / Rehydration

### Теория

**Проблема двойного fetch:**
Без SSR — браузер грузит JS, потом делает fetch. Пользователь видит пустую страницу.
С наивным SSR — сервер рендерит HTML, но клиент при гидрации делает fetch заново → мигание данных.

**Правильный паттерн:**

1. Сервер фетчит данные
2. Сериализует их в HTML (`window.__INITIAL_DATA__ = {...}`)
3. Клиент читает данные из `window.__INITIAL_DATA__` при гидрации
4. Повторного fetch нет — данные уже есть в памяти

```
Server:
  fetch() → data → renderToString(<App data={data}/>) + window.__INITIAL_DATA__ = data

Client:
  hydrateRoot(<App data={window.__INITIAL_DATA__}/>)
  // НЕ делаем fetch при монтировании, если данные уже есть
```

**Dehydration** — сериализация серверного состояния в HTML-строку.
**Rehydration** — восстановление этого состояния на клиенте без повторных запросов.

**Важно про XSS:**
`JSON.stringify(data)` в `<script>` небезопасен — строки могут содержать `</script>`.
Нужно экранировать: заменить `</script>` → `<\/script>`.

---

### Задание

Исходное состояние: сервер передаёт `{ message: "Hi from server" }` как `__INITIAL_PROPS__`.

**Нужно сделать:**

1. Создать фиктивный "API" — функцию `fetchPosts()` в `src/api.ts` которая возвращает массив постов (можно просто `Promise.resolve([...])` с задержкой через `setTimeout`/`sleep`).

2. В `server.ts` — вызвать `fetchPosts()` перед рендером, передать данные в `App` и сериализовать в `window.__INITIAL_DATA__`.

3. В `App.tsx` — принять `posts` как проп. Если проп есть — не делать fetch. Если нет (гипотетически) — делать fetch.

4. В `entry-client.tsx` — читать `window.__INITIAL_DATA__` и передавать в `hydrateRoot`.

5. Экранировать JSON перед вставкой в HTML.

**Структура данных:**

```ts
type Post = {
  id: number;
  title: string;
  body: string;
};
```

---

### Правильный ответ

**`src/api.ts`**

```ts
export type Post = {
  id: number;
  title: string;
  body: string;
};

// Имитация сетевого запроса
export async function fetchPosts(): Promise<Post[]> {
  await new Promise((res) => setTimeout(res, 50)); // ~50ms задержка
  return [
    { id: 1, title: "SSR basics", body: "Server renders HTML first." },
    {
      id: 2,
      title: "Hydration",
      body: "Client takes over without re-fetching.",
    },
    { id: 3, title: "Dehydration", body: "Serialize server state into HTML." },
  ];
}
```

**`src/components/App.tsx`**

```tsx
import React from "react";
import { Post } from "../api";

type AppProps = {
  message: string;
  posts: Post[];
};

export const App = ({ message, posts }: AppProps) => {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <h1>{message}</h1>
      <button onClick={() => setCount((p) => p + 1)}>Count: {count}</button>
      <h2>Posts</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <strong>{post.title}</strong> — {post.body}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

**`src/server.ts`** (изменённая часть внутри `app.get("*", ...)`)

```ts
import { fetchPosts } from "./api";

// helper: экранирует </script> внутри JSON
function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>");
}

// внутри handler:
const posts = await fetchPosts();
const initialProps = { message: "Hi from server", posts };
const appHtml = ReactDOMServer.renderToString(
  React.createElement(App, initialProps),
);

// в HTML:
// <script>window.__INITIAL_DATA__ = ${safeJson(initialProps)};</script>
```

**`src/entry-client.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/App";

declare global {
  interface Window {
    __INITIAL_DATA__: any;
  }
}

const initialData = window.__INITIAL_DATA__;

ReactDOM.hydrateRoot(
  document.getElementById("root")!,
  <App {...initialData} />,
);
```

**Полный `src/server.ts`**

```ts
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { createServer, ViteDevServer } from "vite";
import { fetchPosts } from "./api";

const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>");
}

async function main() {
  const app = express();
  let vite: ViteDevServer | null = null;

  if (!isProd) {
    vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "../client")));
  }

  app.get("*", async (_req, res) => {
    try {
      const { App } = isProd
        ? await import("./components/App")
        : await vite!.ssrLoadModule("/src/components/App.tsx");

      // Фетчим данные на сервере
      const posts = await fetchPosts();
      const initialData = { message: "Hi from server", posts };

      const appHtml = ReactDOMServer.renderToString(
        React.createElement(App, initialData),
      );

      let entry = "/src/entry-client.tsx";
      if (isProd) {
        const manifest = JSON.parse(
          fs.readFileSync(
            path.resolve(__dirname, "../client/.vite/manifest.json"),
            "utf-8",
          ),
        );
        entry = "/" + manifest["src/entry-client.tsx"].file;
      }

      res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React SSR App</title>
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script>window.__INITIAL_DATA__ = ${safeJson(initialData)};</script>
    <script type="module" src="${entry}"></script>
  </body>
</html>`);
    } catch (err) {
      vite?.ssrFixStacktrace(err as Error);
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  });

  app.listen(3000, () => console.log("http://localhost:3000"));
}

main();
```

**Что проверить:**

- `view-source:localhost:3000` — посты уже в HTML, не загружаются JS'ом
- Network tab — нет отдельного fetch-запроса при загрузке страницы
- Кнопка Count работает (гидрация не сломана)
- `window.__INITIAL_DATA__` доступен в консоли

---

## Task 3 — Streaming SSR (`renderToPipeableStream`)

### Теория

**Проблема `renderToString`:**

- Блокирует: сервер рендерит весь HTML, только потом отправляет
- Не поддерживает React Suspense
- Долгий TTFB (Time To First Byte) при тяжёлых компонентах

**`renderToPipeableStream`:**
React 18 API. Отправляет HTML частями через Node.js stream.

```
renderToString:    [====рендер====][========ответ========]
                   ↑ ждём всего    ↑ отправляем всё сразу

renderToPipeableStream:
                   [==рендер==][chunk1]-->[chunk2]-->[chunk3]
                   ↑ начинаем  ↑ отправляем по мере готовности
                   отправлять
                   сразу
```

**Ключевые колбэки:**

- `onShellReady` — базовый HTML без Suspense-границ готов → можно начинать pipe
- `onAllReady` — весь HTML готов (включая все Suspense) → для ботов/SEO
- `onError` — ошибка при рендере
- `onShellError` — ошибка в самом shell (до Suspense)

**Suspense + streaming:**

```tsx
<Suspense fallback={<p>Loading...</p>}>
  <SlowComponent /> // рендерится позже, стримится отдельным chunk'ом
</Suspense>
```

Браузер получает страницу с `<p>Loading...</p>`, потом получает chunk с реальным контентом и заменяет.

**Как работает замена:**
React вставляет в стрим специальный `<script>` который перемещает готовый контент из скрытого `<template>` в нужное место DOM.

**Важно:** `hydrateRoot` на клиенте не меняется — streaming только серверная оптимизация.

---

### Задание

Базис: Task 2 выполнен (есть `fetchPosts`, `App` с постами).

**Нужно сделать:**

1. Заменить `ReactDOMServer.renderToString` на `renderToPipeableStream` в `server.ts`.

2. Использовать `onShellReady` для начала отправки ответа.

3. HTML нельзя собрать в строку как раньше — нужно стримить. Разбить HTML на две части: до `<div id="root">` и после. Использовать `pipe` между ними.

4. Добавить `Suspense` в `App.tsx` вокруг списка постов. Создать компонент `PostList` который симулирует "медленный" рендер (для демонстрации).

5. Обработать ошибки через `onError` и `onShellError`.

**Подсказка по структуре ответа:**

```
res.write('<!DOCTYPE html><html>...<div id="root">')
pipe(res)  // React пишет HTML в res
// после pipe: res.write('</div><script>...</script></html>')
```

Но `pipe` и `res.write` после него не работают вместе напрямую — нужен `Transform` stream или `onAllReady` паттерн.

Проще: использовать `PassThrough` stream из `node:stream` как промежуточный буфер, либо собирать через события `data`/`end`.

---

### Правильный ответ

**`src/components/App.tsx`** (с Suspense)

```tsx
import React, { Suspense } from "react";
import { Post } from "../api";

type AppProps = {
  message: string;
  posts: Post[];
};

function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          <strong>{post.title}</strong> — {post.body}
        </li>
      ))}
    </ul>
  );
}

export const App = ({ message, posts }: AppProps) => {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <h1>{message}</h1>
      <button onClick={() => setCount((p) => p + 1)}>Count: {count}</button>
      <h2>Posts</h2>
      <Suspense fallback={<p>Loading posts...</p>}>
        <PostList posts={posts} />
      </Suspense>
    </div>
  );
};
```

**`src/server.ts`** (с `renderToPipeableStream`)

```ts
import express, { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { createServer, ViteDevServer } from "vite";
import { fetchPosts } from "./api";

const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>");
}

async function handleRequest(
  req: Request,
  res: Response,
  App: React.ComponentType<any>,
  entry: string,
) {
  const posts = await fetchPosts();
  const initialData = { message: "Hi from server", posts };

  const bodyStart = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React SSR App</title>
  </head>
  <body>
    <div id="root">`;

  const bodyEnd = `</div>
    <script>window.__INITIAL_DATA__ = ${safeJson(initialData)};</script>
    <script type="module" src="${entry}"></script>
  </body>
</html>`;

  let didError = false;

  const { pipe, abort } = renderToPipeableStream(
    React.createElement(App, initialData),
    {
      onShellReady() {
        // Shell готов — начинаем отправлять
        res.statusCode = didError ? 500 : 200;
        res.setHeader("Content-Type", "text/html");

        const passThrough = new PassThrough();
        passThrough.pipe(res, { end: false });

        res.write(bodyStart);
        pipe(passThrough);

        passThrough.on("finish", () => {
          res.write(bodyEnd);
          res.end();
        });
      },
      onShellError(err) {
        // Ошибка в shell — отправляем fallback
        console.error(err);
        res.statusCode = 500;
        res.send("<!DOCTYPE html><html><body>Shell Error</body></html>");
      },
      onError(err) {
        didError = true;
        console.error(err);
      },
    },
  );

  // Таймаут — abort если рендер завис
  setTimeout(abort, 10_000);
}

async function main() {
  const app = express();
  let vite: ViteDevServer | null = null;

  if (!isProd) {
    vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "../client")));
  }

  app.get("*", async (req, res) => {
    try {
      const { App } = isProd
        ? await import("./components/App")
        : await vite!.ssrLoadModule("/src/components/App.tsx");

      let entry = "/src/entry-client.tsx";
      if (isProd) {
        const manifest = JSON.parse(
          fs.readFileSync(
            path.resolve(__dirname, "../client/.vite/manifest.json"),
            "utf-8",
          ),
        );
        entry = "/" + manifest["src/entry-client.tsx"].file;
      }

      await handleRequest(req, res, App, entry);
    } catch (err) {
      vite?.ssrFixStacktrace(err as Error);
      console.error(err);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    }
  });

  app.listen(3000, () => console.log("http://localhost:3000"));
}

main();
```

**Что проверить:**

- `curl -N http://localhost:3000` — видны чанки в терминале по мере прихода
- Нет блокировки: ответ начинает приходить до полного рендера
- Suspense fallback виден при медленных компонентах
- Гидрация не сломана (кнопка Count работает)
- При ошибке в `onShellError` — корректный 500

**Разница `onShellReady` vs `onAllReady`:**

|                  | `onShellReady`                   | `onAllReady`                        |
| ---------------- | -------------------------------- | ----------------------------------- |
| Когда            | Shell готов (без Suspense-детей) | Весь HTML готов                     |
| Использовать для | Браузер (быстрый TTFB)           | SEO-краулеры, статическая генерация |
| Streaming        | Да                               | Нет (ждёт всего)                    |
