import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const BACKEND = process.env.VITE_API_URL || "http://localhost:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/auth": BACKEND,
      "/polls": BACKEND,
      "/socket.io": { target: BACKEND, ws: true },

      // The public poll path is shared by the human-facing SPA page and the
      // JSON API. Decide by Accept: if the browser is navigating to a poll
      // share link (text/html) let Vite fall through to index.html so React
      // Router renders the form. Otherwise (fetch from the SPA) proxy to the
      // backend like any other API call.
      "/p": {
        target: BACKEND,
        bypass(req) {
          const accept = req.headers.accept ?? "";
          if (accept.includes("text/html")) {
            return "/index.html";
          }
          return undefined;
        },
      },
    },
  },
});
