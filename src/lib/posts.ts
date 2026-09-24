import { getCollection } from "astro:content";
export const publishedPosts = async () =>
  (await getCollection("posts"))
    .filter((post) => !post.data.draft && post.data.date <= new Date())
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
export const formatDate = (date: Date) =>
  date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
