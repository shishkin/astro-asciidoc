import { defineConfig } from "astro/config";
import asciidoc from "astro-asciidoc";
import { fileURLToPath } from "node:url";

export default defineConfig({
  integrations: [
    asciidoc({
      options: {
        safe: "server",
        attributes: {
          "source-highlighter": "shiki",
        },
      },
      highlighters: {
        shiki: {
          path: fileURLToPath(new URL("shiki-highlighter.js", import.meta.url)),
          options: {
            theme: "solarized-light",
          },
        },
      },
    }),
  ],
});
