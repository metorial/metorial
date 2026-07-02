import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.number().describe('Unique ID of the category'),
  name: z.string().describe('Name of the category'),
  suggestionsCount: z.number().describe('Total suggestions in this category'),
  openSuggestionsCount: z.number().describe('Open suggestions in this category'),
  createdAt: z.string().describe('When the category was created'),
  updatedAt: z.string().describe('When the category was last updated'),
  links: z
    .record(z.string(), z.any())
    .optional()
    .describe('Associated resource links (e.g., forum)')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `List user-facing categories available within forums. Categories organize suggestions into topics visible to end users. Returns category IDs for use with suggestion creation.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      categories: z.array(categorySchema),
      totalRecords: z.number().describe('Total number of categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listCategories({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let categories = result.categories.map((c: any) => ({
      categoryId: c.id,
      name: c.name,
      suggestionsCount: c.suggestions_count || 0,
      openSuggestionsCount: c.open_suggestions_count || 0,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      links: c.links
    }));

    return {
      output: {
        categories,
        totalRecords: result.pagination?.totalRecords || categories.length
      },
      message: `Found **${categories.length}** categories.`
    };
  })
  .build();
