type MarkdownHeading = import("astro").MarkdownHeading;
type AstroComponentFactory = import("astro/dist/runtime/server").AstroComponentFactory;

declare module "*.adoc" {
  export const file: string;
  export const title: string | undefined;
  export const frontmatter: {
    title?: string;
    asciidoc: Record<string, any>;
  };
  export const headings: MarkdownHeading[];
  export const Content: AstroComponentFactory;

  export default Content;
}
