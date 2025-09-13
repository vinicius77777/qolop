import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// configuração nova com Tailwind v4
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [require("@tailwindcss/postcss")],
    },
  },
});
