import { fileURLToPath } from "node:url";
import type { AstroIntegration, ContentEntryType } from "astro";
import type { ViteDevServer } from "vite";
import * as asciidoctor from "./asciidoctor.js";

export type { Options } from "./asciidoctor.js";
export { SyntaxHighlighterBase } from "./asciidoctor.js";

type InternalHookParams = Parameters<
  NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>
>[0] & {
  addPageExtension(ext: string): void;
  addContentEntryType(entryType: ContentEntryType): void;
};

export default function asciidoc(opts?: asciidoctor.Options): AstroIntegration {
  const asciidocFileExt = ".adoc";
  const { options: documentOptions, highlighters, extensions } = opts ?? {};
  let server: ViteDevServer;

  function watchIncludes(file: string, includes: string[]) {
    if (!server) {
      return;
    }
    server.watcher.on("change", async (f) => {
      if (!includes.includes(f)) return;
      const m = server.moduleGraph.getModuleById(file);
      m && (await server.reloadModule(m));
    });
    server.watcher.add(includes);
  }

  return {
    name: "asciidoc",
    hooks: {
      "astro:config:setup": async (params) => {
        const { addPageExtension, addContentEntryType, addRenderer, updateConfig, addWatchFile } =
          params as InternalHookParams;

        addRenderer({ name: "astro:mdx", serverEntrypoint: "@astrojs/mdx/server.js" });
        addPageExtension(asciidocFileExt);

        await asciidoctor.registerExtensions(extensions);
        await asciidoctor.registerHighlighters(highlighters);

        addContentEntryType({
          extensions: [asciidocFileExt],
          async getEntryInfo({ contents, fileUrl }) {
            const data = await asciidoctor.load(fileURLToPath(fileUrl), documentOptions);
            return {
              data: data,
              body: contents,
              rawData: contents,
              slug: data.asciidoc.slug as string,
            };
          },
          handlePropagation: false,
          contentModuleTypes: `declare module "astro:content" {
  interface Render {
    ".adoc": Promise<{
      Content: import("astro").MarkdownInstance<{}>["Content"];
      headings: import("astro").MarkdownHeading[];
      remarkPluginFrontmatter: Record<string, any>;
    }>;
  }
}`,
          async getRenderFunction() {
            return async (entry) => {
              if (!entry.filePath) {
                return { html: "" };
              }
              const doc = await asciidoctor.convert(entry.filePath, {
                ...documentOptions,
                standalone: false,
              });
              return { html: doc.html, metadata: { headings: doc.headings } };
            };
          },
        });

        updateConfig({
          vite: {
            plugins: [
              {
                name: "vite-plugin-astro-asciidoc",
                configureServer(s) {
                  server = s as ViteDevServer;
                },
                async transform(_code, id) {
                  if (!id.endsWith(asciidocFileExt)) return;

                  const doc = await asciidoctor.convert(id, documentOptions);

                  watchIncludes(id, doc.includes);

                  return {
                    code: `import { Fragment, jsx as h } from "astro/jsx-runtime";
${doc.layout ? `import Layout from ${JSON.stringify(doc.layout)};` : ""}
export const file = ${JSON.stringify(id)};
export const title = ${JSON.stringify(doc.frontmatter.title)};
export const frontmatter = ${JSON.stringify(doc.frontmatter)};
export const headings = ${JSON.stringify(doc.headings)};
export async function getHeadings() { return headings; }
export function Content() {
  const content = h(Fragment, { "set:html": ${JSON.stringify(doc.html)} });
  ${
    doc.layout
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
            ],
          },
        });

        addWatchFile(new URL(import.meta.url));
      },
    },
  };
}
