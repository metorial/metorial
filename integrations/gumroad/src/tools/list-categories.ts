import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.number().describe('Numeric category ID accepted as taxonomyId'),
  name: z.string().describe('Short category slug'),
  label: z.string().describe('Human-readable category label'),
  path: z.string().describe('Full category path accepted as category'),
  parentId: z.number().nullable().optional().describe('Parent category ID')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve the Gumroad product category list. Use a category path or taxonomy ID when creating or updating products.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z.array(categorySchema).describe('Available product categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let categories = await client.listCategories();

    let mapped = categories.map((category: any) => ({
      categoryId: category.id,
      name: category.name || '',
      label: category.label || '',
      path: category.path || '',
      parentId: category.parent_id ?? null
    }));

    return {
      output: { categories: mapped },
      message: `Found **${mapped.length}** Gumroad categor${mapped.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
