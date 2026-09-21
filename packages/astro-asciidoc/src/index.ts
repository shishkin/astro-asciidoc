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
  const watchedIncludes = new Map<string, Set<string>>();

  function watchIncludes(file: string, includes: string[]) {
    watchedIncludes.set(file, new Set(includes));
    for (const include of includes) {
      server?.watcher.add(include);
    }
  }

  return {
    name: "asciidoc",
    hooks: {
      "astro:config:setup": async (params) => {
        const {
          config,
          addPageExtension,
          addContentEntryType,
          addRenderer,
          updateConfig,
          addWatchFile,
        } = params as InternalHookParams;

        await asciidoctor.registerExtensions(extensions);
        await asciidoctor.registerHighlighters(highlighters);

        const pagesDir = fileURLToPath(new URL("pages/", config.srcDir));

        addRenderer({ name: "astro:mdx", serverEntrypoint: "@astrojs/mdx/server.js" });
        addPageExtension(asciidocFileExt);

        addContentEntryType({
          extensions: [asciidocFileExt],
          async getEntryInfo({ contents, fileUrl }) {
            const data = await asciidoctor.load(fileURLToPath(fileUrl), documentOptions);
            return {
              data,
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
        });

        updateConfig({
          vite: {
            plugins: [
              {
                name: "vite-plugin-astro-asciidoc",
                configureServer(s) {
                  server = s as ViteDevServer;
                  s.watcher.on("change", async (changed) => {
                    for (const [file, includes] of watchedIncludes) {
                      if (!includes.has(changed)) {
                        continue;
                      }
                      const mod = s.moduleGraph.getModuleById(file);
                      if (mod) {
                        await s.reloadModule(mod);
                      }
                    }
                  });
                },
                async transform(_code, id) {
                  if (!id.endsWith(asciidocFileExt)) {
                    return;
                  }

                  const isPage = id.startsWith(pagesDir);
                  const doc = await asciidoctor.convert(
                    id,
                    isPage ? documentOptions : { ...documentOptions, standalone: false },
                  );

                  const layout = isPage ? doc.layout : undefined;

                  watchIncludes(id, doc.includes);

                  return {
                    code: `import { Fragment, jsx as h } from "astro/jsx-runtime";
${layout ? `import Layout from ${JSON.stringify(layout)};` : ""}
export const file = ${JSON.stringify(id)};
export const title = ${JSON.stringify(doc.frontmatter.title)};
export const frontmatter = ${JSON.stringify(doc.frontmatter)};
export const headings = ${JSON.stringify(doc.headings)};
export async function getHeadings() { return headings; }
export function Content() {
  const content = h(Fragment, { "set:html": ${JSON.stringify(doc.html)} });
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
            ],
          },
        });

        addWatchFile(new URL(import.meta.url));
      },
    },
  };
}
