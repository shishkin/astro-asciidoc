import { fileURLToPath, pathToFileURL, URL } from "node:url";
import type { Document, Section } from "@asciidoctor/core";
import { Extensions, loadFile, SyntaxHighlighter, SyntaxHighlighterBase } from "@asciidoctor/core";
import type { MarkdownHeading } from "astro";

export { SyntaxHighlighterBase };

export interface InitOptions {
  /**
   * Array of syntax highlighters.
   */
  highlighters?: SyntaxHighlighterBase[];

  /**
   * Array of Asciidoctor extensions.
   */
  extensions?: (
    | string
    | {
        /**
         * Import path for the extension implementation.
         */
        path: string;
        /**
         * If the default export is a function it will receive these options as
         * an argument.
         */
        options?: object;
      }
  )[];
}

/**
 * Options for AsciiDoc conversion.
 */
export interface Options extends InitOptions {
  /**
   * Options passed to Asciidoctor document load and document convert.
   */
  options?: ProcessorOptions;
}

type ProcessorOptions = Parameters<typeof loadFile>[1];

type Catalog = {
  includes: Record<string, unknown>;
};

export interface ConversionResult {
  html: string;
  layout?: string;
  frontmatter: {
    title?: string;
    asciidoc: Record<string, unknown>;
  };
  headings: MarkdownHeading[];
  includes: string[];
}

function getHeadings(doc: Document): MarkdownHeading[] {
  const tocLevels = doc.getAttribute("toclevels", 2) as number;
  return doc
    .findBy(
      { context: "section" },
      (b) => (b.getLevel() ?? 0) > 0 && (b.getLevel() ?? 0) <= tocLevels,
    )
    .map((b) => {
      const section = b as Section;
      return {
        text: section.isNumbered()
          ? `${section.getSectionNumber()} ${section.getName() ?? ""}`
          : (section.getName() ?? ""),
        slug: section.getId() ?? "",
        depth: section.getLevel() ?? 0,
      };
    });
}

function getIncludes(file: string, catalog: Catalog): string[] {
  const includes = [];
  for (let include of Object.keys(catalog.includes)) {
    if (!include.endsWith(".adoc")) {
      include = `${include}.adoc`;
    }
    const fileUrl = new URL(include, pathToFileURL(file));
    includes.push(fileURLToPath(fileUrl));
  }
  return includes;
}

async function loadModule<T>(path: string, opts?: object): Promise<T> {
  const { default: mod } = await import(path);
  return mod instanceof Function || typeof mod === "function"
    ? ((mod as (opts?: object) => T).apply(mod, typeof opts === "undefined" ? [] : [opts]) as T)
    : (mod as T);
}

export async function registerHighlighters(
  highlighters: InitOptions["highlighters"],
): Promise<void> {
  for (const hl of highlighters ?? []) {
    SyntaxHighlighter.register(hl, hl.name);
  }
}

export async function registerExtensions(extensions: InitOptions["extensions"]): Promise<void> {
  for (const ext of extensions ?? []) {
    const mod = await loadModule<unknown>(
      typeof ext === "string" ? ext : ext.path,
      typeof ext === "object" ? ext.options : undefined,
    );
    Extensions.register(mod);
  }
}

export async function convert(file: string, options?: ProcessorOptions): Promise<ConversionResult> {
  const doc = await loadFile(file, options);
  const layout = (doc.getAttribute("layout") as string | null) ?? undefined;
  const title = doc.getTitle() ?? undefined;
  const html = await doc.convert({ standalone: !layout, ...options });

  return {
    html,
    layout,
    frontmatter: {
      title,
      asciidoc: doc.getAttributes(),
    },
    headings: getHeadings(doc),
    includes: getIncludes(file, doc.getCatalog() as Catalog),
  };
}
