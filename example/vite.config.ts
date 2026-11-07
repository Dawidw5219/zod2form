import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { zod2form: fileURLToPath(new URL("../src/index.ts", import.meta.url)) } },
})
