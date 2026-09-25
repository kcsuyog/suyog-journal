import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
const draft = "src/content/posts/verification-draft.md";
const future = "src/content/posts/verification-future.md";
assert(
  !existsSync(draft) && !existsSync(future),
  "Test fixture paths must be unused",
);
let server, browser;
try {
  assert.equal(
    spawnSync(process.execPath, ["scripts/new-post.mjs", "Verification draft"])
      .status,
    0,
  );
  const original = readFileSync(draft, "utf8");
  assert.match(original, /draft: true/);
  assert.equal(
    spawnSync(process.execPath, ["scripts/new-post.mjs", "Verification draft"])
      .status,
    1,
  );
  assert.equal(
    readFileSync(draft, "utf8"),
    original,
    "Existing content must never be overwritten",
  );
  assert.equal(
    spawnSync(process.execPath, ["scripts/new-post.mjs", "../../"]).status,
    1,
  );
  writeFileSync(
    future,
    original
      .replace("Verification draft", "Verification future")
      .replace("draft: true", "draft: false")
      .replace(/date: ".*"/, 'date: "2999-01-01"'),
  );
  const build = spawnSync("npm", ["run", "build"], { encoding: "utf8" });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  for (const output of ["index.html", "rss.xml", "sitemap-0.xml"]) {
    const html = readFileSync(`dist/${output}`, "utf8");
    assert(
      !html.includes("verification-draft") &&
        !html.includes("verification-future"),
      `${output} must exclude drafts/future posts`,
    );
  }
  assert(
    !existsSync("dist/verification-draft") &&
      !existsSync("dist/verification-future"),
  );
  const publishedSlugs = [
    "retreat-to-tatopani", "review-of-norwegian-wood",
    "parallel-work-with-orca", "skills-across-claude-codex-and-hermes",
    "tech-lead-when-code-gets-faster",
  ];
  const feed = readFileSync("dist/rss.xml", "utf8");
  const publishedCount = (feed.match(/<item>/g) ?? []).length;
  for (const slug of publishedSlugs) {
    const html = readFileSync(`dist/${slug}/index.html`, "utf8");
    assert(html.includes(`https://www.suyogkc.com.np/${slug}/`));
    assert(readFileSync("dist/rss.xml", "utf8").includes(`/${slug}/`));
  }
  server = spawn(
    process.execPath,
    [
      "node_modules/astro/bin/astro.mjs",
      "preview",
      "--ignore-lock",
      "--host",
      "127.0.0.1",
      "--port",
      "4329",
    ],
    { stdio: "ignore" },
  );
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      ready = (await fetch("http://127.0.0.1:4329")).ok;
    } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert(ready, "Preview server must start");
  browser = await chromium.launch(
    existsSync("/Applications/Google Chrome.app") ? { channel: "chrome" } : {},
  );
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4329");
  await page.waitForSelector("#journal-tools:not([hidden])");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1100);
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  assert.equal(await page.locator(".post-card:visible").count(), publishedCount);
  await page.getByRole("button", { name: "Books", exact: true }).click();
  assert.equal(await page.locator(".post-card:visible").count(), 2);
  assert.match(
    (await page.locator(".post-card:visible").allInnerTexts()).join(" "),
    /Norwegian Wood/,
  );
  await page.getByRole("button", { name: /Everything/ }).click();
  await page.getByRole("searchbox").fill("tatopani");
  assert.equal(await page.locator(".post-card:visible").count(), 1);
  await page.getByRole("searchbox").fill("no-such-story");
  assert(await page.locator("#no-results").isVisible());
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-motion"), "off");
  assert.equal(
    await page
      .locator(".ribbon-track")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await page.locator("h3 a").filter({ hasText: "Norwegian Wood" }).click();
  await page.waitForURL("**/review-of-norwegian-wood/");
  assert(await page.locator(".prose").isVisible());
  await page.screenshot({
    path: "test-results/article-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      "/",
      "/retreat-to-tatopani/",
      "/parallel-work-with-orca/",
      "/skills-across-claude-codex-and-hermes/",
      "/tech-lead-when-code-gets-faster/",
      "/about/",
      "/resume/",
      "/contact/",
    ]) {
      await page.goto(`http://127.0.0.1:4329${route}`);
      await page.waitForTimeout(1100);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} must not overflow at ${width}px`,
      );
      await page.locator("img").evaluateAll((images) =>
        Promise.all(
          images.map((img) => {
            img.loading = "eager";
            return img.decode();
          }),
        ),
      );
      assert(
        await page
          .locator("img")
          .evaluateAll((images) =>
            images.every((img) => img.complete && img.naturalWidth > 0),
          ),
        `${route}: images must load`,
      );
      if (width === 390 && route === "/")
        await page.screenshot({
          path: "test-results/home-mobile.png",
          fullPage: true,
        });
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:4329");
  assert.equal(
    await page
      .locator(".ribbon-track")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  assert(
    await page
      .getByRole("button", { name: "Reduced motion enabled" })
      .isDisabled(),
  );
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noJs.newPage();
  await fallback.goto("http://127.0.0.1:4329");
  assert.equal(await fallback.locator(".post-card:visible").count(), publishedCount);
  assert(!(await fallback.locator("#journal-tools").isVisible()));
  await fallback.goto("http://127.0.0.1:4329/retreat-to-tatopani/");
  assert.match(await fallback.locator(".prose").innerText(), /Pokhara/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:4329/retreat-to-tatopani/');
  const progress = page.locator('.reading-progress');
  if (await page.evaluate(() => CSS.supports('animation-timeline', 'scroll()'))) {
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
    await page.waitForTimeout(200);
    const before = await progress.evaluate(el => getComputedStyle(el).transform);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    assert.notEqual(await progress.evaluate(el => getComputedStyle(el).transform), before, 'Reading bar must track scrolling');
    await page.getByRole('button', {name: 'Pause motion', exact: true}).click();
    assert(!(await progress.isVisible()), 'Pause control must hide reading animation');
    await page.getByRole('button', {name: 'Resume motion', exact: true}).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert(!(await progress.isVisible()), 'Reduced motion must hide reading animation');
  }
  await page.goto('http://127.0.0.1:4329/about/');
  await page.getByRole('link', {name: 'View résumé'}).click();
  await page.waitForURL('**/resume/');
  assert.match(await page.locator('.resume').innerText(), /ShiftCare/);
  const pdfResponse = await fetch('http://127.0.0.1:4329/suyog-kc-resume.pdf');
  assert.equal(pdfResponse.status, 200);
  assert((await pdfResponse.text()).startsWith('%PDF-'), 'Download must be a real PDF');
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(
    "Passed: draft/future exclusion, post creation safety, legacy URLs, RSS, filters, search, motion, desktop/mobile, images, no-JS reading.",
  );
} finally {
  await browser?.close();
  server?.kill();
  for (const path of [draft, future]) if (existsSync(path)) unlinkSync(path);
}
