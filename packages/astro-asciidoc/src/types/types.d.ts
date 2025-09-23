type MarkdownHeading = import("astro").MarkdownHeading;
type AstroComponentFactory = import("astro/dist/runtime/server").AstroComponentFactory;
type AstroRenderer = import("astro").AstroRenderer;

declare module "*.adoc" {
  export const file: string;
  export const title: string | undefined;
  export const frontmatter: {
    title?: string;
    asciidoc: Record<string, unknown>;
  };
  export const headings: MarkdownHeading[];
  export const Content: AstroComponentFactory;

  export default Content;
}

/**
 * This is required as long as moduleResolution=node is used.
 */
declare module "astro/jsx/renderer.js" {
  const renderer: AstroRenderer;
  export default renderer;
}
