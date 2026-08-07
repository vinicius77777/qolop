import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Garante uma única cópia de React/ReactDOM no bundle.
    // No monorepo, o hoisting do npm pode duplicar o react entre a raiz e
    // frontend/node_modules, o que quebra os hooks em produção
    // ("Cannot read properties of null (reading 'useRef')").
    dedupe: ["react", "react-dom"],
  },
});
