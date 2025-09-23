import * as shiki from "shiki";

/**
 * @param {Parameters<shiki.getSingletonHighlighter>[0]} options
 * @returns {import("@asciidoctor/core").SyntaxHighlighterFunctions}
 */
export default async function (options) {
  const highlighter = await shiki.getSingletonHighlighter(options);

  return {
    handlesHighlighting() {
      return true;
    },
    highlight(_node, source, lang) {
      return highlighter.codeToHtml(source, {
        lang,
        theme: options?.themes?.[0] ?? "min-light",
      });
    },
  };
}
