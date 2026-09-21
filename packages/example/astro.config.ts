import { defineConfig } from "astro/config";
import asciidoc from "astro-asciidoc";
import ShikiHighlighter from "./shiki-highlighter.js";

const shiki = await ShikiHighlighter.create({
  themes: ["solarized-light"],
  langs: ["javascript"],
});

export default defineConfig({
  integrations: [
    asciidoc({
      options: {
        safe: "server",
        attributes: {
          "source-highlighter": "shiki",
        },
      },
      highlighters: [shiki],
    }),
  ],
});
