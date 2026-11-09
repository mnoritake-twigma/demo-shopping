import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({ plugins: [react()], resolve: { alias: {"primitives": "/src/vendor/mnoritake-ds/ui/primitives", "icons": "/src/vendor/mnoritake-ds/ui/icons", "layout": "/src/vendor/mnoritake-ds/ui/layout", "hooks": "/src/vendor/mnoritake-ds/ui/hooks", "utils": "/src/vendor/mnoritake-ds/ui/utils", "images": "/src/vendor/mnoritake-ds/ui/images"} }, server: { port: 5173 }, build: { chunkSizeWarningLimit: 750 } });
