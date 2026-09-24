import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
export default defineConfig({
  site: "https://www.suyogkc.com.np",
  trailingSlash: "always",
  integrations: [sitemap({ filter: (page) => !page.endsWith("/404/") })],
});
