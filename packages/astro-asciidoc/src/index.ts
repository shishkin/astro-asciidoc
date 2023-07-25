import type { AstroIntegration, MarkdownHeading } from "astro";
import type { Plugin as VitePlugin, ViteDevServer } from "vite";
import asciidoctor, {
  type ProcessorOptions,
  type SyntaxHighlighterFunctions,
  type Extensions,
  type Document,
  type Section,
} from "@asciidoctor/core";
import { pathToFileURL, fileURLToPath } from "node:url";

type InternalHookParams = Parameters<
  NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>
>[0] & {
  addPageExtension(ext: string): void;
};

type Catalog = {
  [key: string]: any;
  refs: {
    [key: string]: any;
    $$smap: {
      [key: string]: {
        [key: string]: any;
        id: string;
        title: string;
        level: number;
      };
    };
  };
  includes: {
    [key: string]: any;
    $$keys: string[];
  };
};

export interface Options {
  options?: ProcessorOptions;
  extensions?: ((this: Extensions.Registry) => void)[];
  highlighters?: Record<string, SyntaxHighlighterFunctions>;
}

export default function asciidoc(opts?: Options): AstroIntegration {
  const fileExt = ".adoc";
  const asciidocOptions: ProcessorOptions = opts?.options ?? {};
  const converter = asciidoctor();
  let server: ViteDevServer;

  opts?.extensions?.length && opts.extensions.forEach((f) => converter.Extensions.register(f));

  opts?.highlighters &&
    Object.entries(opts.highlighters).forEach(([name, f]) =>
      converter.SyntaxHighlighter.register(name, f),
    );

  function watchIncludes(file: string, catalog: Catalog) {
    for (let include of catalog.includes.$$keys) {
      if (!include.endsWith(fileExt)) {
        include = `${include}${fileExt}`;
      }
      const fileUrl = new URL(include, pathToFileURL(file));
      const filePath = fileURLToPath(fileUrl);
      server.watcher.on("change", async (f) => {
        if (f !== filePath) return;
        const m = server.moduleGraph.getModuleById(file);
        m && (await server.reloadModule(m));
      });
      server.watcher.add(filePath);
    }
  }

  function getHeadings(doc: Document): MarkdownHeading[] {
    const tocLevels = doc.getAttribute("toclevels", 2) as number;
    return doc
      .findBy({ context: "section" }, (b) => b.getLevel() > 0 && b.getLevel() <= tocLevels)
      .map((b) => {
        const section = b as Section;
        return {
          text: section.isNumbered()
            ? `${section.getSectionNumber()} ${section.getName()}`
            : section.getName(),
          slug: section.getId(),
          depth: section.getLevel(),
        };
      });
  }

  return {
    name: "asciidoc",
    hooks: {
      "astro:config:setup": (params) => {
        const { addPageExtension, updateConfig, addWatchFile } = params as InternalHookParams;

        addPageExtension(fileExt);

        updateConfig({
          vite: {
            plugins: [
              {
                name: "vite-plugin-astro-asciidoc",
                configureServer(s) {
                  server = s;
                },
                transform(_code, id) {
                  if (!id.endsWith(fileExt)) return;

                  const doc = converter.loadFile(id, asciidocOptions);
                  const layout = doc.getAttribute("layout") as string | undefined;
                  const html = doc.convert(<ProcessorOptions>{
                    standalone: !layout,
                    ...asciidocOptions,
                  });
                  const headings = getHeadings(doc);
                  const frontmatter = {
                    title: doc.getTitle(),
                    asciidoc: doc.getAttributes(),
                  };

                  watchIncludes(id, doc.getCatalog() as Catalog);

                  return {
                    code: `import { Fragment, jsx as h } from "astro/jsx-runtime";
${layout ? `import Layout from ${JSON.stringify(layout)};` : ""}
export const file = ${JSON.stringify(id)};
export const title = ${JSON.stringify(frontmatter.title)};
export const frontmatter = ${JSON.stringify(frontmatter)};
export const headings = ${JSON.stringify(headings)};
export async function getHeadings() { return headings; }
export async function Content() {
  const content = h(Fragment, { "set:html": ${JSON.stringify(html)} });
  ${
    layout
      ? `return h(Layout, { title, headings, frontmatter, children: content });`
      : `return content;`
  }
}
export default Content;`,
                    meta: {
                      vite: {
                        lang: "ts",
                      },
                    },
                    map: null,
                  };
                },
              },
            ] as VitePlugin[],
          },
        });

        addWatchFile(new URL(import.meta.url));
      },
    },
  };
}
