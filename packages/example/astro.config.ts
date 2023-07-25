import { defineConfig } from "astro/config";
import asciidoc from "astro-asciidoc";
import * as shiki from "shiki";

const highlighter = await shiki.getHighlighter({
  theme: "solarized-light",
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
      highlighters: {
        shiki: {
          handlesHighlighting() {
            return true;
          },
          highlight(_node, source, lang, _opts) {
            return highlighter.codeToHtml(source, { lang });
          },
        },
      },
    }),
  ],
});
