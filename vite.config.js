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
        short_name: "Groove Music",
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
        target:
          "https://groove-j2szeaw7j-dikshants-projects-9f5680cd.vercel.app/",
        changeOrigin: true,
      },
    },
  },
  base: "/groove/",
});
