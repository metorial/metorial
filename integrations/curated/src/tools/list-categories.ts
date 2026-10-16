import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve all categories configured for a publication. Each category includes its code (used as identifier when creating/updating links), display name, and whether it is a sponsored category with a per-issue link limit. Call list_publications to discover the publication ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicationId: publicationIdSchema
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata'),
      categories: z.array(
        z.object({
          code: z.string().describe('Category identifier code used in link management'),
          name: z.string().describe('Display name of the category'),
          sponsored: z.boolean().describe('Whether this is a sponsored category'),
          linkLimit: z
            .number()
            .nullable()
            .describe('Maximum sponsored links per issue, null for non-sponsored categories')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let categories = await client.listCategories(ctx.input.publicationId);

    let mapped = categories.map(cat => ({
      code: cat.code,
      name: cat.name,
      sponsored: cat.sponsored,
      linkLimit: cat.limit
    }));

    return {
      output: {
        raw: categories,
        categories: mapped
      },
      message: `Found **${mapped.length}** category/categories: ${mapped.map(c => `${c.name} (${c.code})`).join(', ')}.`
    };
  })
  .build();
