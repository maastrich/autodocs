import { defineConfig } from "./src/utils/config";

export default defineConfig({
  openai: {
    maxTokens: 200,
  },
  includes: ["src/**/*.{ts,tsx}"],
});
