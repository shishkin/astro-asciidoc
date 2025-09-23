import type {
  Document,
  ProcessorOptions,
  Asciidoctor,
  Section,
  SyntaxHighlighterFunctions,
} from "@asciidoctor/core";
import asciidoctor from "@asciidoctor/core";
import type { MarkdownHeading } from "astro";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";

export interface InitOptions {
  /**
   * Map of syntax highlighters.
   */
  highlighters?: {
    [name: string]:
      | string
      | {
          /**
           * Import path for the {@link SyntaxHighlighterFunctions}
           * implementation
           */
          path: string;
          /**
           * If default export is a function it will receive these options as
           * an argument.
           */
          options?: object;
        };
  };

  /**
   * Array of Asciidoctor extensions.
   */
  extensions?: (
    | string
    | {
        /**
         * Import path for the {@link AsciidoctorExtension}
         * implementation
         */
        path: string;
        /**
         * If default export is a function it will receive these options as
         * an argument.
         */
        options?: object;
      }
  )[];
}

export interface InputMessage {
  file: string;
  options?: ProcessorOptions;
}

export interface OutputMessage {
  html: string;
  layout?: string;
  frontmatter: {
    title?: string;
    asciidoc: Record<string, unknown>;
  };
  headings: MarkdownHeading[];
  includes: string[];
}

type AsciidoctorExtension = NonNullable<Parameters<Asciidoctor["Extensions"]["register"]>[0]>;

type Catalog = {
  [key: string]: unknown;
  refs: {
    [key: string]: unknown;
    $$smap: {
      [key: string]: {
        [key: string]: unknown;
        id: string;
        title: string;
        level: number;
      };
    };
  };
  includes: {
    [key: string]: unknown;
    $$keys: string[];
  };
};

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

function getIncludes(file: string, catalog: Catalog): string[] {
  const includes = [];
  for (let include of catalog.includes.$$keys) {
    if (!include.endsWith(".adoc")) {
      include = `${include}.adoc`;
    }
    const fileUrl = new URL(include, pathToFileURL(file));
    const filePath = fileURLToPath(fileUrl);
    includes.push(filePath);
  }
  return includes;
}

async function loadModule<T>(path: string, opts?: object): Promise<T> {
  const { default: mod } = await import(path);
  return mod instanceof Function || typeof mod === "function"
    ? ((mod as (opts?: object) => T).apply(mod, typeof opts === "undefined" ? [] : [opts]) as T)
    : (mod as T);
}

async function registerHighlighters(
  registry: Asciidoctor["SyntaxHighlighter"],
  highlighters: InitOptions["highlighters"],
): Promise<void> {
  for await (const [name, f] of Object.entries(highlighters ?? {})) {
    const hl = await loadModule<SyntaxHighlighterFunctions>(
      typeof f === "string" ? f : f.path,
      typeof f === "object" ? f.options : undefined,
    );
    registry.register(name, hl);
  }
}

async function registerExtensions(
  registry: Asciidoctor["Extensions"],
  extensions: InitOptions["extensions"],
): Promise<void> {
  for await (const ext of extensions ?? []) {
    const mod = await loadModule<AsciidoctorExtension>(
      typeof ext === "string" ? ext : ext.path,
      typeof ext === "object" ? ext.options : undefined,
    );
    registry.register(mod);
  }
}

async function worker(opts?: InitOptions) {
  const converter = asciidoctor();

  await registerHighlighters(converter.SyntaxHighlighter, opts?.highlighters);
  await registerExtensions(converter.Extensions, opts?.extensions);

  parentPort?.on("message", (data: InputMessage) => {
    const doc = converter.loadFile(data.file, data.options);
    const layout = doc.getAttribute("layout") as string | undefined;
    const html = doc.convert(<ProcessorOptions>{
      standalone: !layout,
      ...data.options,
    });

    const result: OutputMessage = {
      html,
      layout,
      frontmatter: {
        title: doc.getTitle(),
        asciidoc: doc.getAttributes(),
      },
      headings: getHeadings(doc),
      includes: getIncludes(data.file, doc.getCatalog() as Catalog),
    };
    parentPort?.postMessage(result);
  });
}

worker(workerData as InitOptions);
