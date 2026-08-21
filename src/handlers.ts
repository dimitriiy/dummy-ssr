export const getPosts = async () => {
  await new Promise((res) => setTimeout(res, 1000));

  return {
    posts: [
      { id: "1", title: "Hello World" },
      { id: "2", title: "Fake API Guide" },
    ],
  };
};
