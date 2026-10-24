import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The shadcn components live at the repository root (`/components/ui`), so the
 * preview app resolves the `@/*` alias one level up — exactly like a project
 * whose `components.json` maps `@/*` to its root.
 *
 * Because the component sits outside this package, its bare imports (`react`)
 * would resolve upwards from `/components` and miss this app's `node_modules`.
 * The aliases below pin them to the copies installed here, so one React instance
 * is shared by the app and the component.
 */
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const previewRoot = fileURLToPath(new URL(".", import.meta.url));
const dependency = (name: string) => join(previewRoot, "node_modules", name);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": projectRoot,
      react: dependency("react"),
      "react-dom": dependency("react-dom"),
      clsx: dependency("clsx"),
      "tailwind-merge": dependency("tailwind-merge"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    // the sandbox serves the app through a proxied preview host
    allowedHosts: [".e2b.app", ".arena.ai"],
    // allow reading ../components and ../lib (the real component location)
    fs: {
      allow: [projectRoot],
    },
  },
});
