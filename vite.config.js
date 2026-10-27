import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { localApi } from "./server/vite-api.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
  server: {
    host: "127.0.0.1",
    fs: {
      deny: [
        ".env",
        ".env.*",
        "**/.git/**",
        "**/server/**",
        "**/api/**",
        "**/scripts/**",
      ],
    },
  },
});
