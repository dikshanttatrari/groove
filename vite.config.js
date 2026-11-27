import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: "Groove Music",
        short_name: "GrooveMusic",
        start_url: "/",
        scope: "/",
        theme_color: "#110f0d",
        background_color: "#110f0d",
        display: "standalone",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://groove-api-three.vercel.app/",
        changeOrigin: true,
      },
    },
  },
  base: "/",
});
