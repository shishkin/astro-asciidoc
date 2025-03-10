import type {ProcessorOptions} from "@asciidoctor/core";
import type {AstroIntegration} from "astro";
import {fileURLToPath} from "url";
import type {ViteDevServer} from "vite";
import AsciidocConverter from "./asciidoctor.js";
import type {InitOptions} from "./worker.js";

type InternalHookParams = Parameters<
  NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>
>[0] & {
  addPageExtension(ext: string): void;
};

/**
 * Options for AsciiDoc conversion.
 */
export interface Options extends InitOptions {
  /**
   * Options passed to Asciidoctor document load and document convert.
   */
  options?: ProcessorOptions;
}

export default function asciidoc(opts?: Options): AstroIntegration {
  const asciidocFileExt = ".adoc";
  const { options: documentOptions, highlighters } = opts ?? {};
  const converter = new AsciidocConverter({
    highlighters,
  });
  let server: ViteDevServer;

  function watchIncludes(file: string, includes: string[]) {
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
      "astro:config:setup": (params) => {
        const { addPageExtension, addRenderer, updateConfig, addWatchFile } =
          params as InternalHookParams;

        addRenderer({
          name: "astro-asciidoc",
          serverEntrypoint: fileURLToPath(
              new URL("./renderer.js", import.meta.url),
          ),
      });
        addPageExtension(asciidocFileExt);

        updateConfig({
          vite: {
            plugins: [
              {
                name: "vite-plugin-astro-asciidoc",
                configureServer(s) {
                  // @ts-expect-error type conflict in dependencies
                  server = s as ViteDevServer;
                },
                async transform(_code, id) {
                  if (!id.endsWith(asciidocFileExt)) return;

                  const doc = await converter.convert({
                    file: id,
                    options: documentOptions,
                  });

                  watchIncludes(id, doc.includes);

                  return {
                    code: `import { Fragment, jsx as h } from "astro/jsx-runtime";
${doc.layout ? `import Layout from ${JSON.stringify(doc.layout)};` : ""}
export const file = ${JSON.stringify(id)};
export const title = ${JSON.stringify(doc.frontmatter.title)};
export const frontmatter = ${JSON.stringify(doc.frontmatter)};
export const headings = ${JSON.stringify(doc.headings)};
export async function getHeadings() { return headings; }
export async function Content() {
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
      "astro:server:done": async () => {
        await converter.terminate();
      },
      "astro:build:done": async () => {
        await converter.terminate();
      },
    },
  };
}
