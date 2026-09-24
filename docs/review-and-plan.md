# Review and plan — 24 September 2026

## Outcome

Create a separate, animated personal journal that makes publishing Markdown posts simple, preserves existing articles and URLs, and gives Suyog a distinctive visual identity. The user selected Markdown in the repository and bold editorial typography with playful animation.

## Existing blog review

Reviewed the public repository at commit `3a9dfb2`, its content, Gatsby page generation, navigation, contact handler, metadata, and the live homepage response. The live site returned HTTP 200 with Netlify headers and the same two article titles. Also inspected a desktop screenshot of the live site: its fixed left profile sidebar, small circular article thumbnails, right icon rail, and mostly empty main panel make the archive feel more like an app shell than a personal journal. The redesign gives the author an introduction, clearer reading hierarchy, and a responsive document layout. This is a source, visual, and functional review, not a measured performance audit.

| Finding | Evidence | Response in the new project |
| --- | --- | --- |
| Outdated framework and beta UI dependencies | `package.json`: Gatsby `^1.9.244`, Material UI `1.0.0-beta.36`; Redux, JSS, and custom scrollbars for a two-post site | Static Astro pages and CSS; no React runtime or shared UI state store |
| Contact submissions always fail | `ContactForm.js` calls `handleNetworkError()` and prevents default submission; sending code is commented out | Working email link and social profile links; no false success message |
| Weak metadata | Site description is `PersonalBlog.`; `Seo.js` concatenates an optional slug into the Open Graph URL, producing `undefined` where no slug exists | Descriptions, absolute canonical/Open Graph URLs, article-specific metadata, RSS and sitemap |
| Starter material remains | `/starters/` contains starter projects and package author/repository still name the original starter | Personal about page and redirects for retired routes |
| Motion is coupled to navigation state | Navigator changes `left`, width, height, and position across several Redux states and timeout-driven transitions | Native scrolling/navigation, CSS transform effects, reduced-motion support and pause control |
| Strong personal material is already available | Two Markdown posts, original Tatopani photos, Norwegian Wood image, profile portrait | Migrate these instead of inventing articles or using generic stock photos |
| Prior integrations add setup burden | Algolia, Google Analytics, Facebook, Disqus and Netlify-form configuration | Local archive filtering, email contact, optional services deferred |

The original article bodies are preserved apart from repairing invalid caption markup, replacing an emoji shortcode, making image paths absolute, and adding image alternative text. Dates come from the original directory names. The about page is a concise paraphrase of the existing biography, without carrying its time-sensitive “nearly six years” claim forward. Homepage copy is new editorial copy for the redesign.

## Framework choice

| Option | Fit | Decision |
| --- | --- | --- |
| **Astro + Markdown + TypeScript** | Generates static HTML, validates content, supports small interactive scripts, needs no application server | Selected |
| Next.js + MDX | Useful for a React application with authentication, dashboards or dynamic server features | Extra runtime/concepts for this journal; reconsider if it becomes a web application |
| Keep and upgrade Gatsby | Preserves the existing development model | Requires migrating many old plugins and navigation mechanisms; a clean two-post migration is smaller |

Use Astro content collections for schema validation and static routing. The shared published-post query excludes drafts and future dates, sorts newest first, and supplies the homepage, article generation and RSS. Sitemap derives from generated pages. Build errors catch malformed frontmatter. The new-post command refuses to overwrite an existing file and defaults to draft.

References: [Astro content collections](https://docs.astro.build/en/guides/content-collections/), [view transitions](https://docs.astro.build/en/guides/view-transitions/), [Netlify deployment](https://docs.astro.build/en/guides/deploy/netlify/).

## Design

Palette: paper `#f8f8fd`, lavender `#e9e5fa`, ink `#29245c`, muted text `#625e7b`, yellow-green `#e7f075`. Manrope supplies the clear, large homepage typography; Fraunces adds literary character to section and article headings. The recognizable element is a layered collage of real photographs with handwritten-style captions. Content stays left aligned except the article title.

Desktop: compact navigation → headline alongside collage → animated text ribbon → searchable two-column journal → personal introduction → footer. Mobile: headline, collage, single-column journal. Article pages prioritize a readable 690px column, generous line height, and photographs. No scroll hijacking or mandatory loading sequence.

Motion: entrance choreography, pointer-responsive photography, hover transformations, floating sticker, rotating mark, continuous ribbon, and native page transitions. OS reduced-motion and a persistent pause control apply to all decorative effects. Controls work by keyboard; pages remain readable without JavaScript. The requested animation is concentrated on the homepage rather than disrupting long-form reading.

## Build sequence and acceptance checks

1. Create an isolated Astro project, pin dependency versions in the lockfile, and configure static hosting.
2. Migrate both articles and assets while retaining root-level slugs. Add schema validation and draft exclusion.
3. Build the home, article, about, contact and 404 pages; add motion, search, filters and accessible fallbacks.
4. Add canonical metadata, feed, sitemap, post creation command and hosting redirects.
5. Check TypeScript and production generation. Exercise filtering, empty search, post navigation, mobile overflow, image loading, motion persistence, reduced-motion preference, and no-JavaScript reading in a browser. Check post creation and overwrite refusal.
6. Deliver a local preview and deployment instructions. The user requested the repository under `kcsuyog/suyog-journal`; hosting publication and the production domain cutover remain pending.

## Hosting decision

Recommend **Netlify** because the existing site already uses it. A static build requires no adapter. Start with a separate preview site, then reconnect the existing production Netlify site to the new repository after review to keep domain management simple. Cloudflare Pages is a suitable alternative but introduces a host migration without a demonstrated benefit here. The concrete deployment and rollback steps are in the README.

## Deliberate scope limits

No CMS (user chose Markdown), database, logins, React component library, animation library, analytics or invented content. Plain CSS/native platform features cover this design. Search is a linear scan of the small archive; if the archive grows to hundreds of posts, adopt a static search index such as Pagefind. A browser editor can be added later if the authoring preference changes.

## Verification result

TypeScript/Astro checks passed with zero errors, warnings or hints. Production generation and browser checks passed: original routes, RSS, draft/future-date exclusion, safe post creation, category/search interactions, empty results, persistent motion pause, OS reduced motion, loaded images, 390px and 320px viewport overflow checks, and no-JavaScript article reading. Desktop and mobile screenshots are in `test-results/` (ignored by Git). No remote deployment has been performed.

## Follow-up: editorial polish, profile and résumé

At the author’s request, both 2018 articles were copyedited for grammar and structure while retaining their dates, URLs, stories and opinions. The profile now includes verified experience and public work, with an HTML résumé and a generated one-page PDF. Employment dates, education and numerical achievements are omitted where not verified. Profile and résumé content share `src/data/profile.json`.

Article entrances, scroll reveals and a reading-progress bar extend the existing motion. Native CSS timelines are feature-detected; pause and reduced-motion controls disable decorative animation. Production browser checks cover scrolling, pause/reduced-motion behaviour, profile-to-résumé navigation and the PDF download.
