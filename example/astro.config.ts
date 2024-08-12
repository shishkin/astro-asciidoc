import { defineConfig } from "astro/config";
import asciidoc from "astro-asciidoc";
import type { default as shikiHighlighter } from "./shiki-highlighter.js";
import { fileURLToPath } from "node:url";

type ShikiOptions = Parameters<typeof shikiHighlighter>[0];

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
            themes: ["solarized-light"],
            langs: ["javascript"],
          } satisfies ShikiOptions,
        },
      },
    }),
  ],
});
