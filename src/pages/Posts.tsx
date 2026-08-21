import React from "react";

type Post = { id: string | number; title: string };

const Posts = ({ posts }: { posts: Post[] }) => {
  console.log("p", posts);
  return (
    <div>
      <a href="/">← Home</a>
      <h1>Posts</h1>
      <ul>
        {posts?.map((p) => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default Posts;
