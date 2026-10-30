import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Flask backend already allows cross-origin requests (CORS is open),
// so no dev proxy is needed. The API address comes from VITE_API_URL.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
