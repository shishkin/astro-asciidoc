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
- Load AsciiDoc on the server-side
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
        safe: "server",
      },
    }),
  ],
});
```

### Write Pages in AsciiDoc

Add `.adoc` pages to `src/pages/` directory:

```asciidoc
// src/pages/demo.adoc
= Page Title
:layout: ./src/layouts/Main.astro

== Heading

Text paragraph.

include::_include.adoc[]
```

Use frontmatter and props in the layout:

```astro
---
// src/layouts/Main.astro
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

### Load AsciiDoc Files

It is also possible to load AsciiDoc on the server side to get access to frontmatter and render the document manually.

First, add `astro-asciidoc` type reference to the `src/env.d.ts` file:

```typescript
// src/env.d.ts

/// <reference types="astro/client" />
/// <reference types="astro-asciidoc/dist/types.d.ts" />
```

Now import the AsciiDoc file normally from any `.astro` page or framework component:

```astro
---
import Layout from "~/layouts/Main.astro";
import * as doc from "./index.adoc";
---

<Layout title={doc.title} headings={doc.headings}>
  <p>written by {doc.frontmatter.asciidoc.author}</p>
  <doc.Content />
  <p>File: {doc.file}</p>
</Layout>
```

Please note that the default export is the `Content` component itself.
In order to access named exports, `import * as doc` or `import { frontmatter }` syntax should be used.

See [example](./example/) project for more details.

## Caveats

NOTE: This integration runs Asciidoctor in a worker thread to prevent [prototype pollution](https://github.com/shishkin/astro-asciidoc/issues/3) from the Opal/Ruby runtime.
That means that all options that need to be passed to the Asciidoctor converter need to be serializable according to [worker threads message passing limitations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).
In particular it is currently not possible to pass extensions and syntax highlighters as functions.
They need to be in separate Javascript modules and passed through via module file path.
Writing extensions and syntax highlighters in TypeScript is also currently not possible.
See [example](./example/) project for a sample syntax highlighter integration.

For the same reason it is not possible to expose Asciidoctor classes like `Document` and `Section` directly in loaded frontmatter.
As an alternative one can write an Asciidoctor extension that will extract required data from the document and store it in document attributes.
Attributes are available in frontmatter after import.

## Alternatives

Depending on your particular needs you might be interested in other similar projects:

- [**astro-adoc**](https://github.com/devidw/astro-addons/tree/main/packages/astro-adoc) - load or glob `.adoc` documents and render them in a provided component;
- [**vite-plugin-asciidoc**](https://github.com/Djaler/vite-plugin-asciidoc) - General AsciiDoc Vite loader without any special Astro integration;
- [**rollup-plugin-asciidoc**](https://github.com/carlosvin/rollup-plugin-asciidoc) - Genral AsciiDoc Rollup loader without any special Astro integration;

When I last checked, those ran Asciidoctor directly and didn't prevent [prototype pollution](https://github.com/shishkin/astro-asciidoc/issues/3) from the Opal/Ruby runtime.
