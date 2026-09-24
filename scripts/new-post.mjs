import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const title = process.argv.slice(2).join(" ").trim();
const slug = title
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
if (
  !slug ||
  [
    "about",
    "contact",
    "404",
    "index",
    "search",
    "starters",
    "success",
  ].includes(slug)
) {
  console.error(
    'Use a unique title containing letters or numbers: npm run new:post -- "My new story"',
  );
  process.exit(1);
}
const path = fileURLToPath(
  new URL(`../src/content/posts/${slug}.md`, import.meta.url),
);
try {
  writeFileSync(
    path,
    `---\ntitle: ${JSON.stringify(title)}\ndescription: "Add a short summary."\ndate: "${new Date().toISOString().slice(0, 10)}"\ncategory: "Life"\ncover: "/images/tatos.jpg"\ncoverAlt: "The hills around Tatopani"\ndraft: true\n---\n\nStart your story here.\n`,
    { flag: "wx" },
  );
  console.log(
    `Created ${path}\nEdit the post, then set draft: false to publish.`,
  );
} catch (error) {
  console.error(
    error.code === "EEXIST"
      ? "A post with this title already exists. Nothing overwritten."
      : error.message,
  );
  process.exit(1);
}
