# Astro AsciiDoc

[![CI](https://github.com/shishkin/astro-asciidoc/actions/workflows/ci.yaml/badge.svg)](https://github.com/shishkin/astro-asciidoc/actions/workflows/ci.yaml)
[![npm](https://img.shields.io/npm/v/astro-asciidoc)](https://www.npmjs.com/package/astro-asciidoc)

Support [AsciiDoc](https://docs.asciidoctor.org/asciidoc/latest/) pages in [Astro](https://astro.build).

Attention: this package hasn't reached v1 yet and breaking changes may be introduced in minor or patch updates!

## Features

- Convert AsciiDoc pages with [AsciiDoctor.js](https://docs.asciidoctor.org/asciidoctor.js/latest/)
- Support of AsciiDoc `include`s
- Hot reloading of pages and includes
- Access AsciiDoc page attributes in frontmatter props
- Support of Astro layouts
- Render pages in standalone mode if no layout provided
- Page outline/TOC is available in props as Astro `MarkdownHeadings`
- Provide AsciiDoctor converter options
- Register AsciiDoctor extensions and syntax highlighters

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

See [example](./packages/example/) project for more details.
