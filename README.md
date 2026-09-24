# Suyog’s journal

An animated personal blog built with Astro, TypeScript, and plain CSS. Original writing and photographs migrated from [krazzyblog](https://github.com/suyogkrazz/krazzyblog), keeping `/review-of-norwegian-wood/` and `/retreat-to-tatopani/` intact.

## Run locally

Node 22.12 or newer is required; `.nvmrc` selects Node 22.

```sh
npm ci
npm run dev
```

Open http://localhost:4321. Build and preview with `npm run build` and `npm run preview`.

## Write a post

```sh
npm run new:post -- "A weekend in the mountains"
```

This creates a draft in `src/content/posts/`. Edit the Markdown, add your photo to `public/images/`, and update the frontmatter. The filename is its public URL: use a unique, lowercase, hyphenated filename and keep it unchanged once published. Avoid filenames matching pages such as `about`, `contact`, or `404`.

```yaml
---
title: "A weekend in the mountains"
description: "A short preview for readers and search engines."
date: "2026-09-24"
category: "Life"
cover: "/images/mountains.jpg"
coverAlt: "Clouds over the mountains at sunrise"
draft: false
---
```

Images within posts use `![Description](/images/mountains.jpg)`. Dates are interpreted in UTC. Drafts and future-dated posts are excluded from pages, search, sitemap, and RSS. Future posts need a new deployment on or after their publication date; there is no scheduled publishing service. To preview a draft, temporarily set `draft: false` and a non-future date locally, then revert before committing. Categories are generated from published posts. Commit and push to the connected GitHub branch to publish.

## Validate

```sh
npm run check
npm run build
npm test
```

`npm test` checks generated pages and feeds, exercises the post generator’s overwrite protection, and uses Chrome/Chromium for desktop/mobile interaction checks. Install a browser with `npx playwright install chromium` if Chrome is not installed. It starts and stops its own preview server. Review screenshots are saved to the ignored `test-results/` directory.

## Hosting

Use **Netlify**, matching the existing blog’s host. The `netlify.toml` file sets the build command, output directory, Node version, and redirects from retired pages. Static Astro needs no server adapter, database, or environment secrets.

1. Use the repository [kcsuyog/suyog-journal](https://github.com/kcsuyog/suyog-journal). This project lives at its root.
2. In Netlify, import that repository as a **new site**. Build: `npm run build`; publish directory: `dist`; Node: `22`. The checked-in configuration supplies these settings.
3. Review its temporary `*.netlify.app` URL on desktop and phone. Check article URLs, images, keyboard navigation, RSS, and email link. Keep the existing production site available during review.
4. When ready, use the existing production Netlify site’s repository settings to connect the new repo, check the build settings, and deploy. This keeps its current domain association and avoids unnecessary DNS changes. Alternatively, transfer the domains to the new Netlify site after removing them from the old site.
5. Keep `www.suyogkc.com.np` as primary to match the canonical URL in `astro.config.mjs` and sitemap in `public/robots.txt`; redirect the apex to it in Netlify. If you prefer the apex, change both files first. Confirm TLS and both hostnames after deployment.
6. Check previously published URLs and `/rss.xml`. The old Gatsby app registered an offline service worker: check an existing browser profile for stale caches during cutover, and retire that worker if it remains active before announcing the new site.
7. Keep the old GitHub repo and previous production deploy for rollback. In Netlify, republish the previous deploy if needed, and restore its repository connection before further automatic builds.

The project repository is `kcsuyog/suyog-journal`. Netlify deployment and DNS changes remain pending.

Astro’s [Netlify deployment guide](https://docs.astro.build/en/guides/deploy/netlify/) documents static hosting. [Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/) is an alternative with the same build command and `dist` output; Netlify is the simpler migration for this existing site. Hosting charges depend on the account’s current plan and usage; no paid plan is required by the application itself.

## Design and scope

The homepage uses lavender, ink blue, and yellow-green with Manrope and Fraunces, self-hosted through Fontsource. The photography is yours. Motion uses CSS and a small pointer handler: a staged entrance, photo interaction, floating sticker, rotating asterisk, scrolling ribbon, and native cross-document transitions where supported. OS reduced-motion preferences and the persistent footer pause button disable the effects. Native document scrolling, semantic links, keyboard focus, and static HTML remain usable without JavaScript; filtering controls only appear when JavaScript runs.

There is no CMS, analytics, external search service, comments system, or contact backend. Contact opens an email draft or links to your public profiles. Add those services only if you want their specific workflows. Search currently runs over the published article text embedded in the homepage; revisit this when the archive reaches hundreds of posts.

See [the review and implementation plan](docs/review-and-plan.md) for findings and framework tradeoffs. Original content/assets retain their provenance; the legacy repository’s MIT notice is preserved in `LICENSE.legacy`.
