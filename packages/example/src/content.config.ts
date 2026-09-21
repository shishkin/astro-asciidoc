import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const ascii = defineCollection({
  loader: glob({ pattern: "**/*.adoc", base: "./src/content/ascii" }),
  schema: z.object({
    title: z.string().optional(),
    asciidoc: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const collections = { ascii };
