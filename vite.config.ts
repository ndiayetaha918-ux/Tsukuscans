import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";

// Tsuki Scans — installable PWA. The service worker pre-caches the app shell
// and runtime-caches cover art so the home, feed and reader stay usable offline.
export default defineConfig({
  // Base is injected by CI so the app works under a project sub-path
  // (e.g. GitHub Pages: /Tsukuscans/). Defaults to root for local dev/preview.
  base: process.env.VITE_BASE || "/",
  resolve: {
    alias: { "@": resolve(process.cwd(), "src") },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Tsuki Scans",
        short_name: "Tsuki",
        description: "Your next read, found in the dark. A premium manga discovery & reading experience.",
        lang: "fr",
        theme_color: "#07070b",
        background_color: "#07070b",
        display: "standalone",
        orientation: "portrait",
        categories: ["entertainment", "books"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/icons/"),
            handler: "CacheFirst",
            options: { cacheName: "tsuki-icons", expiration: { maxEntries: 32 } },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
