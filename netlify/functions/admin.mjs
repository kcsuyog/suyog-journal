import { createHmac, timingSafeEqual } from "node:crypto";
import { parse, stringify } from "yaml";

const repo = "kcsuyog/suyog-journal";
const branch = "main";
const folder = "src/content/posts/";
const cookieName = "journal_admin";
const lifetime = 12 * 60 * 60;
// Posts are served from the site root, so their slugs must not collide with pages.
const reserved = ["about", "admin", "contact", "resume", "404", "index", "search", "starters", "success", "images", "rss"];

export const config = {
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

function equal(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function configured() {
  return process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD?.length >= 12 &&
    process.env.ADMIN_SESSION_SECRET?.length >= 32 && process.env.GITHUB_TOKEN;
}

function sign(value) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(`${value}:${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`)
    .digest("base64url");
}

function authenticated(request) {
  const token = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!token) return false;
  const [expires, signature] = token.split(".");
  return /^\d+$/.test(expires) && Number(expires) > Date.now() / 1000 &&
    Number(expires) <= Date.now() / 1000 + lifetime && equal(signature || "", sign(expires));
}

function cookie(request, token, maxAge) {
  return `${cookieName}=${token}; Path=/.netlify/functions/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

class Failure extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    if (response.status === 404) throw new Failure(404, "Post not found.");
    if (response.status === 409 || response.status === 422)
      throw new Failure(409, "The repository changed. Reload the post before saving again.");
    throw new Failure(502, "GitHub could not complete the request. Check the server token and repository access.");
  }
  return response.json();
}

function postPath(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 || reserved.includes(slug))
    throw new Failure(400, "Use lowercase letters, numbers and single hyphens for the URL, and avoid page names like about or contact.");
  return `${folder}${slug}.md`;
}

function decodePost(file) {
  const text = Buffer.from(file.content, "base64").toString("utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Failure(400, "The post has invalid Markdown frontmatter.");
  const data = parse(match[1]);
  // YAML parses unquoted dates as Date objects; the editor works with YYYY-MM-DD strings.
  if (data.date instanceof Date) data.date = data.date.toISOString().slice(0, 10);
  return { ...data, body: match[2].trimStart(), sha: file.sha };
}

function validatePost(post) {
  if (!post || typeof post !== "object") throw new Failure(400, "Post details are required.");
  for (const name of ["title", "description", "category", "coverAlt", "body"])
    if (typeof post[name] !== "string" || !post[name].trim())
      throw new Failure(400, `The ${name} field is required.`);
  if (post.title.length > 300 || post.description.length > 2000 || post.category.length > 60 || post.body.length > 200000)
    throw new Failure(400, "The post is too large.");
  if (typeof post.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(post.date) ||
    !Number.isFinite(Date.parse(post.date)) || new Date(post.date).toISOString().slice(0, 10) !== post.date)
    throw new Failure(400, "Choose a valid publication date.");
  if (typeof post.cover !== "string" || !/^\/images\/[A-Za-z0-9_.\/-]+$/.test(post.cover) || post.cover.includes(".."))
    throw new Failure(400, "Choose a cover image from this site or upload one.");
  if (typeof post.draft !== "boolean") throw new Failure(400, "Choose draft or publish.");
}

async function save(input) {
  const { post, slug, sha, media = [] } = input;
  const path = postPath(slug);
  validatePost(post);
  if (!Array.isArray(media) || media.length > 10) throw new Failure(400, "Too many images.");
  let mediaBytes = 0;
  for (const file of media) {
    if (!file || typeof file.name !== "string" || !/^upload-[a-f0-9-]+\.(jpg|png|webp|gif)$/.test(file.name) ||
      typeof file.data !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data))
      throw new Failure(400, "Invalid image upload.");
    const bytes = Buffer.from(file.data, "base64");
    mediaBytes += bytes.length;
    const isImage = file.name.endsWith(".jpg") ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) :
      file.name.endsWith(".png") ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
      file.name.endsWith(".gif") ? /^GIF8[79]a/.test(bytes.subarray(0, 6).toString()) :
      bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!isImage || bytes.length > 1024 * 1024) throw new Failure(400, "Upload JPG, PNG, WebP or GIF images up to 1 MB each.");
  }
  if (mediaBytes > 3 * 1024 * 1024) throw new Failure(400, "Save at most 3 MB of new images at a time.");
  const ref = await github(`git/ref/heads/${branch}`);
  const head = ref.object.sha;
  let existing;
  try { existing = await github(`contents/${path}?ref=${head}`); }
  catch (error) { if (error.status !== 404) throw error; }
  if ((existing?.sha || null) !== (sha || null))
    throw new Failure(409, "This post changed or its URL is already used. Reload it or choose another URL.");
  if (!media.some((file) => post.cover === `/images/${file.name}`)) {
    try { await github(`contents/public${post.cover}?ref=${head}`); }
    catch (error) {
      if (error.status === 404) throw new Failure(400, "The cover image does not exist. Upload one or choose an existing image.");
      throw error;
    }
  }
  const metadata = {
    title: post.title.trim(), description: post.description.trim(), date: post.date,
    category: post.category.trim(), cover: post.cover, coverAlt: post.coverAlt.trim(), draft: post.draft,
  };
  const content = `---\n${stringify(metadata)}---\n\n${post.body.trim()}\n`;
  const postBlob = await github("git/blobs", { method: "POST", body: JSON.stringify({ content, encoding: "utf-8" }) });
  const treeEntries = [{ path, mode: "100644", type: "blob", sha: postBlob.sha }];
  for (const file of media) {
    const blob = await github("git/blobs", { method: "POST", body: JSON.stringify({ content: file.data, encoding: "base64" }) });
    treeEntries.push({ path: `public/images/${file.name}`, mode: "100644", type: "blob", sha: blob.sha });
  }
  const commit = await github(`git/commits/${head}`);
  const tree = await github("git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: treeEntries }) });
  const next = await github("git/commits", { method: "POST", body: JSON.stringify({ message: `${post.draft ? "Save draft" : "Publish post"}: ${metadata.title}`, tree: tree.sha, parents: [head] }) });
  await github(`git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: next.sha, force: false }) });
  return { sha: postBlob.sha, draft: post.draft };
}

async function listPosts() {
  let entries;
  try { entries = await github(`contents/${folder}?ref=${branch}`); }
  catch (error) { if (error.status === 404) return []; throw error; }
  const files = entries.filter((file) => file.type === "file" && file.name.endsWith(".md"));
  const posts = [];
  for (let index = 0; index < files.length; index += 8) {
    posts.push(...await Promise.all(files.slice(index, index + 8).map(async (file) => {
      const post = decodePost(await github(`contents/${file.path}?ref=${branch}`));
      return {
        slug: file.name.slice(0, -3), sha: post.sha, title: post.title,
        description: post.description, date: post.date, category: post.category,
        draft: Boolean(post.draft),
      };
    })));
  }
  return posts.sort((left, right) => String(right.date).localeCompare(String(left.date)));
}

async function removePost(input) {
  const path = postPath(input.slug);
  if (typeof input.sha !== "string" || !input.sha)
    throw new Failure(400, "Reload the post list before removing a post.");
  const existing = await github(`contents/${path}?ref=${branch}`);
  if (existing.sha !== input.sha)
    throw new Failure(409, "This post changed. Refresh the list and review it before removing it.");
  await github(`contents/${path}`, {
    method: "DELETE",
    body: JSON.stringify({ message: `Remove post: ${input.slug}`, sha: input.sha, branch }),
  });
  return { removed: input.slug };
}

export default async function handler(request) {
  try {
    if (!configured()) return json({ error: "Admin setup is incomplete. Configure the Netlify environment variables listed in README.md." }, 503);
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "session";
    if (!["GET", "POST"].includes(request.method)) return json({ error: "Method not allowed." }, 405);
    if (request.method === "POST" && request.headers.get("origin") !== url.origin)
      return json({ error: "Request origin is not allowed." }, 403);
    let input;
    if (request.method === "POST") {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "Expected JSON." }, 415);
      const text = await request.text();
      if (Buffer.byteLength(text) > 4.5 * 1024 * 1024) return json({ error: "The upload is too large." }, 413);
      try { input = JSON.parse(text); } catch { return json({ error: "Invalid JSON." }, 400); }
      if (!input || typeof input !== "object") return json({ error: "Invalid request." }, 400);
    }
    if (action === "login" && request.method === "POST") {
      if (typeof input.username !== "string" || typeof input.password !== "string" ||
        !equal(input.username, process.env.ADMIN_USERNAME) || !equal(input.password, process.env.ADMIN_PASSWORD))
        return json({ error: "Incorrect username or password." }, 401);
      const expires = String(Math.floor(Date.now() / 1000) + lifetime);
      return json({ authenticated: true }, 200, { "Set-Cookie": cookie(request, `${expires}.${sign(expires)}`, lifetime) });
    }
    if (action === "logout" && request.method === "POST")
      return json({ authenticated: false }, 200, { "Set-Cookie": cookie(request, "", 0) });
    if (!authenticated(request)) return json({ error: "Please sign in." }, 401);
    if (action === "session" && request.method === "GET") return json({ authenticated: true });
    if (action === "posts" && request.method === "GET") return json({ posts: await listPosts() });
    if (action === "post" && request.method === "GET")
      return json(decodePost(await github(`contents/${postPath(url.searchParams.get("slug"))}?ref=${branch}`)));
    if (action === "save" && request.method === "POST") return json(await save(input));
    if (action === "remove" && request.method === "POST") return json(await removePost(input));
    return json({ error: "Unknown action." }, 404);
  } catch (error) {
    return json({ error: error instanceof Failure ? error.message : "Something went wrong. Please try again." }, error.status || 500);
  }
}
