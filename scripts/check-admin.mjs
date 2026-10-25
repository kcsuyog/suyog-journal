import assert from "node:assert/strict";
import { parse } from "yaml";
import handler from "../netlify/functions/admin.mjs";

process.env.ADMIN_USERNAME = "test-writer";
process.env.ADMIN_PASSWORD = "test-only-password-123";
process.env.ADMIN_SESSION_SECRET = "test-only-session-secret-of-at-least-32-characters";
process.env.GITHUB_TOKEN = "test-only-token";
const origin = "https://journal.example";
let session;
let calls = [];
const originalFetch = globalThis.fetch;
function request(action, body, options = {}) {
  return new Request(`${origin}/.netlify/functions/admin?action=${action}${options.slug ? `&slug=${encodeURIComponent(options.slug)}` : ""}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(session ? { cookie: session } : {}), origin: options.origin || origin,
      ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const post = {
  title: "A weekend away", description: "Short summary", date: "2026-10-04", category: "Life",
  cover: "/images/tatos.jpg", coverAlt: "Hills", draft: true, body: "## Hello\n\nText.",
};

try {
  globalThis.fetch = async () => { throw new Error("Unexpected network call"); };
  assert.equal((await handler(request("posts"))).status, 401);
  assert.equal((await handler(request("save", { post, slug: "test" }))).status, 401);
  assert.equal((await handler(request("login", { username: "test-writer", password: "wrong" }))).status, 401);
  assert.equal((await handler(request("login", { username: "test-writer", password: process.env.ADMIN_PASSWORD }, { origin: "https://evil.example" }))).status, 403);
  const login = await handler(request("login", { username: "test-writer", password: process.env.ADMIN_PASSWORD }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert(cookie.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("SameSite=Strict"));
  session = cookie.split(";")[0];
  assert.equal((await handler(request("session"))).status, 200);
  const goodSession = session;
  session += "tampered";
  assert.equal((await handler(request("session"))).status, 401);
  session = goodSession;
  for (const slug of ["../private", "about", "Upper", "a--b"])
    assert.equal((await handler(request("post", undefined, { slug }))).status, 400, slug);
  assert.equal((await handler(request("save", { post: { ...post, date: "2026-02-31" }, slug: "test" }))).status, 400);
  assert.equal((await handler(request("save", { post, slug: "test", media: [{ name: "upload-abcd.png", data: "bm90IGFuIGltYWdl" }] }))).status, 400);

  let existingSha = null;
  globalThis.fetch = async (url, options) => {
    const path = String(url).split("/repos/kcsuyog/suyog-journal/")[1];
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, body, method: options.method || "GET" });
    if (path === "git/ref/heads/main") return Response.json({ object: { sha: "head-sha" } });
    if (path.startsWith("contents/src/content/posts/"))
      return existingSha ? Response.json({ sha: existingSha }) : Response.json({}, { status: 404 });
    if (path === "git/blobs") return Response.json({ sha: "blob-sha" });
    if (path.startsWith("contents/public/images/")) return Response.json({ sha: "image-sha" });
    if (path === "git/commits/head-sha") return Response.json({ tree: { sha: "base-tree" } });
    if (path === "git/trees") return Response.json({ sha: "new-tree" });
    if (path === "git/commits") return Response.json({ sha: "new-commit" });
    if (path === "git/refs/heads/main") return Response.json({ object: { sha: "new-commit" } });
    throw new Error(`Unexpected path: ${path}`);
  };
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==";
  const saved = await handler(request("save", {
    post: { ...post, cover: "/images/upload-abcd.png", draft: false }, slug: "a-weekend-away",
    media: [{ name: "upload-abcd.png", data: png }],
  }));
  assert.equal(saved.status, 200, await saved.clone().text());
  const blob = calls.find((call) => call.path === "git/blobs" && call.body.encoding === "utf-8").body.content;
  const frontmatter = parse(blob.match(/^---\n([\s\S]*?)\n---\n/)[1]);
  assert.equal(frontmatter.draft, false);
  assert.equal(frontmatter.title, post.title);
  assert(blob.includes(post.body));
  assert.deepEqual(calls.find((call) => call.path === "git/trees").body.tree.map((entry) => entry.path),
    ["src/content/posts/a-weekend-away.md", "public/images/upload-abcd.png"]);
  assert.equal(calls.at(-1).body.force, false);
  existingSha = "changed-sha";
  calls = [];
  assert.equal((await handler(request("save", { post, slug: "test", sha: "old-sha" }))).status, 409);
  assert(!calls.some((call) => call.method === "POST" || call.method === "PATCH"));

  globalThis.fetch = async () => Response.json({
    sha: "existing", content: Buffer.from('---\ntitle: "Test"\ndescription: "D"\ndate: 2026-08-20\ncategory: "Life"\ncover: "/images/tatos.jpg"\ncoverAlt: "Hills"\n---\n\n## Body\n').toString("base64"),
  });
  const read = await (await handler(request("post", undefined, { slug: "test" }))).json();
  assert.equal(read.date, "2026-08-20", "Unquoted YAML dates must come back as strings");
  assert(read.body.startsWith("## Body"));
  calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ method: options.method || "GET" });
    return Response.json({ sha: "existing" });
  };
  assert.equal((await handler(request("remove", { slug: "test", sha: "stale" }))).status, 409);
  assert(!calls.some((call) => call.method === "DELETE"));
  assert.equal((await handler(request("remove", { slug: "test", sha: "existing" }))).status, 200);
  assert(calls.some((call) => call.method === "DELETE"));
  assert((await handler(request("logout", {}))).headers.get("set-cookie").includes("Max-Age=0"));
  delete process.env.GITHUB_TOKEN;
  assert.equal((await handler(request("session"))).status, 503);
  console.log("Passed: admin auth, CSRF, slug/post validation, Git saves, date reads, removal and conflict protection.");
} finally { globalThis.fetch = originalFetch; }
