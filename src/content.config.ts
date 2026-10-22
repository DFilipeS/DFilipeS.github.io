import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    label: z.string(),
    original: z.string().url().nullable(),
    platform: z.string().nullable(),
    writtenFor: z.string().url().optional(),
    writtenForName: z.string().optional(),
    order: z.number().int(),
  }),
});
export const collections = { posts };
