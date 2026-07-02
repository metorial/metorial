import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.string().describe('Unique ID of the category'),
  name: z.string().describe('Name of the category')
});

export let listCardCategories = SlateTool.create(spec, {
  name: 'List Card Categories',
  key: 'list_card_categories',
  description: `Retrieve all available card categories. Use the returned category IDs to filter cards when browsing card designs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z.array(categorySchema).describe('Available card categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCategories();
    let rawCategories = result.categories ?? [];

    let categories = rawCategories.map((c: any) => ({
      categoryId: String(c.id),
      name: c.name ?? ''
    }));

    return {
      output: { categories },
      message: `Found **${categories.length}** card categories.`
    };
  })
  .build();
