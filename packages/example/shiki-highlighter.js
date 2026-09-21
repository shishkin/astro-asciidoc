import { SyntaxHighlighterBase } from "astro-asciidoc";
import * as shiki from "shiki";

/** @typedef {Partial<shiki.BundledHighlighterOptions<shiki.BundledLanguage, shiki.BundledTheme>>} Options */

export default class ShikiHighlighter extends SyntaxHighlighterBase {
  /** @type {shiki.Highlighter} */
  $highlighter;

  /** @type {Options} */
  $options;

  constructor(highlighter, options) {
    super("shiki");
    this.$highlighter = highlighter;
    this.$options = options;
  }

  /**
   * @param {Options} [options={}]
   * @return {Promise<ShikiHighlighter>}
   */
  static async create(options = {}) {
    const highlighter = await shiki.getSingletonHighlighter(options);
    return new ShikiHighlighter(highlighter, options);
  }

  handlesHighlighting() {
    return true;
  }

  highlight(_node, source, lang) {
    return this.$highlighter.codeToHtml(source, {
      lang,
      theme: this.$options.themes?.[0] ?? "min-light",
    });
  }

  format(node) {
    return node.content();
  }
}
