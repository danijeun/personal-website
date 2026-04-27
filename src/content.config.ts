import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string().optional(),
      kicker: z.string(),
      dek: z.string().max(120),
      year: z.number().int(),
      role: z.string(),
      stack: z.array(z.string()),
      links: z
        .object({
          github: z.string().url().optional(),
          live: z.string().url().optional(),
          devpost: z.string().url().optional(),
          paper: z.string().url().optional(),
          demo: z.string().url().optional(),
          npm: z.string().url().optional(),
        })
        .default({}),
      hero: image().optional(),
      heroCaption: z.string().optional(),
      heroCredit: z.string().optional(),
      status: z.enum(["shipped", "archived", "in_progress"]),
      featured: z.boolean().default(false),
      pullQuote: z.string().optional(),
      whatBroke: z.string().optional(),
      order: z.number().int().default(100),
    }),
});

export const collections = { projects };
