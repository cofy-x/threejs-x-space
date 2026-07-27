import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/threejs-x-space/" : "/",
  plugins: [react()],
}));
