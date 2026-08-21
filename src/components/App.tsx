import React from "react";

type Post = {
  id?: number | string;
  [key: string]: unknown;
};

const App = ({ message, posts }: { message: string; posts?: Post[] }) => {
  const [value, setValue] = React.useState(0);
  const [data, setData] = React.useState<Post[]>(posts ?? []);

  console.log(posts);
  React.useEffect(() => {
    if (!posts || posts.length === 0) {
      fetch("/posts", { method: "POST" })
        .then((r) => r.json())
        .then(setData);
    }
  }, [posts]);

  return (
    <div>
      <h1>{message ?? "Hello from React SSR!"}</h1>
      <p>{value}</p>
      <button onClick={() => setValue((p) => p + 1)}>Click Me</button>
      <ul>
        {data.map((post) => (
          <li key={post.id}>{post.id}</li>
        ))}
      </ul>
    </div>
  );
};

export default App;
