# Astro AsciiDoc

[![CI](https://github.com/shishkin/astro-asciidoc/actions/workflows/ci.yaml/badge.svg)](https://github.com/shishkin/astro-asciidoc/actions/workflows/ci.yaml)
[![npm](https://img.shields.io/npm/v/astro-asciidoc)](https://www.npmjs.com/package/astro-asciidoc)

Support [AsciiDoc](https://docs.asciidoctor.org/asciidoc/latest/) pages in [Astro](https://astro.build).

Attention: this package hasn't reached v1 yet and breaking changes may be introduced in minor or patch updates!

## Features

- Convert AsciiDoc pages with [Asciidoctor.js](https://docs.asciidoctor.org/asciidoctor.js/latest/)
- Support of AsciiDoc `include`s
- Hot reloading of pages and includes
- Access AsciiDoc page attributes in frontmatter props
- Support of Astro layouts
- Render pages in standalone mode if no layout provided
- Page outline/TOC is available in props as Astro `MarkdownHeadings`
- Provide Asciidoctor converter options
- Register Asciidoctor extensions and syntax highlighters
- Runs Asciidoctor in a worker thread to prevent prototype pollution from Opal/Ruby runtime

## Usage

Install:

```bash
npm i astro-asciidoc
```

Add integration to the Astro config:

```typescript
//astro.config.ts

import { defineConfig } from "astro/config";
import asciidoc from "astro-asciidoc";

export default defineConfig({
  integrations: [
    asciidoc({
      options: {
        /* Asciidoctor.js options */
      },
    }),
  ],
});
```

Add `.adoc` pages to `src/pages/` directory:

```asciidoc
= Page Title
:layout: ./src/layouts/Main.astro

== Heading

Text paragraph.

include::_include.adoc[]
```

Use frontmatter and props in the layout:

```astro
---
import type { MarkdownHeading } from "astro";
export interface Props {
  title?: string;
  headings?: MarkdownHeading[];
}
const { title = "Astro", headings = [] } = Astro.props;
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
  </head>
  <body>
    <nav>
      <ul>
        {
          headings.map((h) => (
            <li>
              <a href={`#${h.slug}`}>{h.text}</a>
            </li>
          ))
        }
      </ul>
    </nav>
    <main>
      <slot />
    </main>
  </body>
</html>
```

See [example](./example/) project for more details.

## Caveats

NOTE: This integration runs Asciidoctor in a worker thread to prevent [prototype pollution](https://github.com/shishkin/astro-asciidoc/issues/3) from the Opal/Ruby runtime.
That means that all options that need to be passed to the Asciidoctor converter need to be serializable according to [worker threads message passing limitations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).
In particular it is currently not possible to pass extensions and syntax highlighters as functions.
They need to be in separate Javascript modules and passed through via module file path.
Writing extensions and syntax highlighters in TypeScript is also currently not possible.
See [example](./example/) project for a sample syntax highlighter integration.

## Alternatives

Depending on your particular needs you might be interested in other similar projects:

- [**astro-adoc**](https://github.com/devidw/astro-addons/tree/main/packages/astro-adoc) - load or glob `.adoc` documents and render them in a provided component;
- [**vite-plugin-asciidoc**](https://github.com/Djaler/vite-plugin-asciidoc) - General AsciiDoc Vite loader without any special Astro integration;
- [**rollup-plugin-asciidoc**](https://github.com/carlosvin/rollup-plugin-asciidoc) - Genral AsciiDoc Rollup loader without any special Astro integration;

When I last checked, those ran Asciidoctor directly and didn't prevent [prototype pollution](https://github.com/shishkin/astro-asciidoc/issues/3) from the Opal/Ruby runtime.
