import * as shiki from "shiki";

/**
 * @param {shiki.HighlighterOptions} options
 * @returns {import("@asciidoctor/core").SyntaxHighlighterFunctions}
 */
export default async function (options) {
  const highlighter = await shiki.getHighlighter(options);

  return {
    handlesHighlighting() {
      return true;
    },
    highlight(_node, source, lang, _opts) {
      return highlighter.codeToHtml(source, { lang });
    },
  };
}
