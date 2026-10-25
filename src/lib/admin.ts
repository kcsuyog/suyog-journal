import { marked } from "marked";
import DOMPurify from "dompurify";

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => element<HTMLInputElement>(id);
const status = element<HTMLParagraphElement>("status");
const form = element<HTMLFormElement>("post-form");
const body = element<HTMLTextAreaElement>("body");
const preview = element<HTMLDialogElement>("post-preview");
const previewFrame = element<HTMLIFrameElement>("preview-frame");
type PostSummary = { slug: string; sha: string; title: string; description: string; date: string; category: string; draft: boolean };
type Post = Omit<PostSummary, "slug" | "sha"> & { body: string; cover: string; coverAlt: string };

let currentSha: string | null = null;
let dirty = false;
let busy = false;
let media: { name: string; data: string }[] = [];
// Uploaded images are only in the browser until saved; map their future /images/ path to a data URL for previews.
const uploads = new Map<string, string>();

form.addEventListener("input", () => { dirty = true; });
window.addEventListener("beforeunload", (event) => { if (dirty) event.preventDefault(); });
body.addEventListener("input", countWords);

function countWords() {
  element("word-count").textContent = `${body.value.trim().split(/\s+/).filter(Boolean).length} words`;
}

function message(text: string, error = false) {
  status.textContent = text;
  status.dataset.error = String(error);
}

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function api(action: string, data?: unknown, slug?: string) {
  const query = new URLSearchParams({ action });
  if (slug) query.set("slug", slug);
  const response = await fetch(`/.netlify/functions/admin?${query}`, {
    method: data === undefined ? "GET" : "POST",
    credentials: "same-origin",
    ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error("The admin server is unavailable. Deploy to Netlify or run Netlify Dev."); }
  if (!response.ok) {
    if (response.status === 401 && action !== "login") showLogin();
    throw new ApiError(response.status, result.error || "Request failed.");
  }
  return result;
}

function showLogin() {
  element("login-panel").hidden = false;
  element("workspace").hidden = true;
  element("logout").hidden = true;
}

function showWorkspace() {
  element("login-panel").hidden = true;
  element("workspace").hidden = false;
  element("logout").hidden = false;
}

function showEditor(open: boolean) {
  element("posts-panel").hidden = open;
  element("editor-panel").hidden = !open;
}

function setBusy(value: boolean) {
  busy = value;
  document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>("button, select").forEach((field) => { field.disabled = value; });
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
    .forEach((field) => { field.disabled = value || (field.id === "slug" && currentSha !== null); });
}

const mayLeave = () => !dirty || window.confirm("You have unsaved changes. Discard them?");

function filterPosts() {
  const query = input("post-search").value.trim().toLowerCase();
  const state = element<HTMLSelectElement>("post-filter").value;
  let found = 0;
  element("post-list").querySelectorAll<HTMLElement>(".post-row").forEach((row) => {
    row.hidden = !row.dataset.search?.includes(query) || (state !== "all" && state !== row.dataset.state);
    if (!row.hidden) found++;
  });
  element("search-status").textContent = found ? `${found} posts` : "No posts match.";
}
input("post-search").addEventListener("input", filterPosts);
element("post-filter").addEventListener("change", filterPosts);

const postState = (post: Pick<PostSummary, "date" | "draft">) =>
  post.draft ? "draft" : new Date(post.date) > new Date() ? "scheduled" : "published";

function postDetails(post: Pick<PostSummary, "date" | "category" | "draft">) {
  const date = new Date(post.date).toLocaleDateString("en-AU", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
  return `${post.category} · ${date} · ${postState(post)}`;
}

async function refreshPosts() {
  const result = await api("posts");
  const posts = result.posts as PostSummary[];
  const list = element("post-list");
  list.replaceChildren();
  for (const post of posts) {
    const row = document.createElement("article");
    row.className = "post-row";
    row.dataset.search = `${post.title} ${post.category} ${post.slug}`.toLowerCase();
    row.dataset.state = postState(post);
    const title = document.createElement("h3");
    title.textContent = post.title;
    const details = document.createElement("p");
    details.className = "help";
    details.textContent = postDetails(post);
    const actions = document.createElement("div");
    actions.className = "actions";
    for (const [label, action, className] of [
      ["Preview", () => previewPost(post.slug), "secondary"],
      ["Edit", () => editPost(post.slug), "secondary"],
      ["Remove", () => removePost(post), "danger"],
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.textContent = label;
      button.setAttribute("aria-label", `${label}: ${post.title}`);
      button.addEventListener("click", () => { if (!busy) void action(); });
      actions.append(button);
    }
    row.append(title, details, actions);
    list.append(row);
  }
  if (!posts.length) list.textContent = "No posts yet.";
  element("post-count").textContent = String(posts.length);
  element("categories").replaceChildren(...[...new Set(posts.map((post) => post.category))].map((category) => new Option(category)));
  filterPosts();
}

element("refresh-posts").addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  try { await refreshPosts(); message("Post list refreshed."); }
  catch (error) { message((error as Error).message, true); }
  finally { setBusy(false); }
});

async function previewPost(slug: string) {
  setBusy(true);
  try { showPreview(await api("post", undefined, slug)); }
  catch (error) { message((error as Error).message, true); }
  finally { setBusy(false); }
}

// Renders the post with the live site's stylesheet and article markup inside a sandboxed frame.
function showPreview(post: Post) {
  const doc = document.implementation.createHTMLDocument(post.title);
  doc.documentElement.dataset.motion = "off";
  const css = doc.createElement("link");
  css.rel = "stylesheet";
  css.href = previewFrame.dataset.css!;
  doc.head.append(css);
  doc.body.innerHTML = '<main><article class="article wrap"><header class="article-header"><div class="post-meta"></div><h1></h1><p></p></header><img class="article-cover" /><div class="prose"></div></article></main>';
  doc.querySelector(".post-meta")!.textContent = postDetails(post);
  doc.querySelector("h1")!.textContent = post.title;
  doc.querySelector(".article-header p")!.textContent = post.description;
  const cover = doc.querySelector<HTMLImageElement>(".article-cover")!;
  if (post.cover?.startsWith("/images/")) Object.assign(cover, { src: uploads.get(post.cover) ?? post.cover, alt: post.coverAlt });
  else cover.remove();
  const prose = doc.querySelector(".prose")!;
  prose.innerHTML = DOMPurify.sanitize(marked.parse(post.body, { async: false }));
  prose.querySelectorAll("img").forEach((image) => {
    const upload = uploads.get(image.getAttribute("src") || "");
    if (upload) image.src = upload;
  });
  previewFrame.srcdoc = `<!doctype html>${doc.documentElement.outerHTML}`;
  preview.showModal();
}

element("close-preview").addEventListener("click", () => preview.close());
document.querySelectorAll<HTMLButtonElement>(".preview-sizes [data-width]").forEach((button) => button.addEventListener("click", () => {
  previewFrame.style.width = button.dataset.width!;
  document.querySelectorAll(".preview-sizes [data-width]").forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
}));

const formPost = (): Post => ({
  title: input("title").value, description: input("description").value, category: input("category").value,
  date: input("date").value, cover: input("cover").value, coverAlt: input("cover-alt").value, draft: true, body: body.value,
});
element("preview-draft").addEventListener("click", () => showPreview(formPost()));

async function removePost(post: PostSummary) {
  const removesCurrent = currentSha !== null && input("slug").value === post.slug;
  if (!window.confirm(`Remove “${post.title}”?\nIt disappears from the site after the next deploy.`)) return;
  setBusy(true);
  try {
    await api("remove", { slug: post.slug, sha: post.sha });
    if (removesCurrent) resetPost();
    await refreshPosts();
    message("Post removed. It leaves the site after Netlify rebuilds.");
  } catch (error) { message((error as Error).message, true); }
  finally { setBusy(false); }
}

function resetPost() {
  form.reset();
  currentSha = null;
  input("date").value = new Date().toLocaleDateString("en-CA");
  dirty = false;
  media = [];
  uploads.clear();
  element("cover-preview").hidden = true;
  element("editor-title").textContent = "New post";
  countWords();
}

element<HTMLFormElement>("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  try {
    await api("login", { username: input("username").value, password: input("password").value });
    input("password").value = "";
    showWorkspace();
    await refreshPosts();
    message("Signed in.");
  } catch (error) { message((error as Error).message, true); }
  finally { setBusy(false); }
});

element("logout").addEventListener("click", async () => {
  if (busy || !mayLeave()) return;
  setBusy(true);
  try { await api("logout", {}); resetPost(); showEditor(false); showLogin(); message("Signed out."); }
  catch (error) { message((error as Error).message, true); }
  finally { setBusy(false); }
});

element("new-post").addEventListener("click", () => {
  resetPost();
  showEditor(true);
  message("Writing a new post.");
  input("title").focus();
});

element("back-to-list").addEventListener("click", () => {
  if (!mayLeave()) return;
  resetPost();
  showEditor(false);
});

// Suggest a URL from the title until the post is saved or the URL is edited by hand.
input("title").addEventListener("input", () => {
  const slug = input("slug");
  if (currentSha || slug.dataset.edited) return;
  slug.value = input("title").value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
});
input("slug").addEventListener("input", () => { input("slug").dataset.edited = "true"; });
form.addEventListener("reset", () => { delete input("slug").dataset.edited; });

async function editPost(slug: string) {
  setBusy(true);
  try {
    const post = await api("post", undefined, slug);
    resetPost();
    currentSha = post.sha;
    for (const id of ["title", "description", "category", "date", "cover"]) input(id).value = post[id] ?? "";
    input("cover-alt").value = post.coverAlt ?? "";
    input("slug").value = slug;
    body.value = post.body;
    countWords();
    updateCoverPreview();
    element("editor-title").textContent = post.title;
    showEditor(true);
    message(post.draft ? "Editing a draft." : "Editing a published post.");
  } catch (error) { message((error as Error).message, true); }
  finally { setBusy(false); }
}

function updateCoverPreview() {
  const image = element<HTMLImageElement>("cover-preview");
  const src = input("cover").value;
  image.hidden = !src.startsWith("/images/");
  if (!image.hidden) image.src = uploads.get(src) ?? src;
}
input("cover").addEventListener("change", updateCoverPreview);

async function readImage(file: File) {
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  if (!extensions[file.type] || file.size > 1024 * 1024) throw new Error("Choose a JPG, PNG, WebP or GIF image up to 1 MB.");
  if (media.length >= 10 || media.reduce((total, item) => total + item.data.length * .75, 0) + file.size > 3 * 1024 * 1024)
    throw new Error("Save the post first; at most 3 MB of new images can be added per save.");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
  const name = `upload-${crypto.randomUUID()}.${extensions[file.type]}`;
  media.push({ name, data });
  uploads.set(`/images/${name}`, `data:${file.type};base64,${data}`);
  return `/images/${name}`;
}

for (const id of ["cover-file", "inline-file"]) {
  input(id).addEventListener("change", async () => {
    const files = Array.from(input(id).files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        const path = await readImage(file);
        if (id === "cover-file") { input("cover").value = path; updateCoverPreview(); }
        else {
          const alt = input("inline-alt").value.trim().replace(/[[\]]/g, "");
          const at = body.selectionEnd;
          const before = body.value.slice(0, at);
          const snippet = `${before && !before.endsWith("\n\n") ? before.endsWith("\n") ? "\n" : "\n\n" : ""}![${alt}](${path})\n\n`;
          body.setRangeText(snippet, at, at, "end");
          countWords();
        }
        dirty = true;
      }
      message("Image ready. It is committed when you save the post.");
    } catch (error) { message((error as Error).message, true); }
    finally { input(id).value = ""; setBusy(false); }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  const draft = (event as SubmitEvent).submitter?.getAttribute("value") !== "publish";
  if (!body.value.trim()) { message("Write the post body first.", true); body.focus(); return; }
  setBusy(true);
  message("Saving…");
  try {
    const result = await api("save", { slug: input("slug").value, sha: currentSha, media, post: { ...formPost(), draft } });
    currentSha = result.sha;
    dirty = false;
    media = [];
    element("editor-title").textContent = input("title").value;
    message(draft ? "Draft saved. It stays off the public site." : "Published. The site updates after Netlify rebuilds.");
    try { await refreshPosts(); } catch { /* The post is saved even if the list refresh fails. */ }
  } catch (error) { message((error as Error).message, true); }
  finally { setBusy(false); }
});

async function start() {
  resetPost();
  try { await api("session"); showWorkspace(); await refreshPosts(); message("Signed in."); }
  catch (error) {
    showLogin();
    if (error instanceof ApiError && error.status === 401) message("Sign in to manage posts.");
    else message((error as Error).message, true);
  }
}
void start();
