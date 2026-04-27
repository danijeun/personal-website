import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://danijeun.com",
  output: "static",
  adapter: vercel({
    edgeMiddleware: false,
    webAnalytics: { enabled: true },
  }),
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => !page.includes("/dev/"),
      changefreq: "monthly",
      priority: 0.7,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  experimental: {
    clientPrerender: true,
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "viewport",
  },
});
