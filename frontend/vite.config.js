import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // base must match the GitHub repository name so asset paths resolve on Pages
  base: "/ML_review2/",
  plugins: [react()],
  server: {
    port: 5173,
  },
});
