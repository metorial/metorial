import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEventCategories = SlateTool.create(spec, {
  name: 'List Event Categories',
  key: 'list_event_categories',
  description:
    'List Pipeline CRM task and event categories. Use a category ID when creating or updating a calendar entry.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            categoryId: z.number().describe('Category ID'),
            name: z.string().nullable().describe('Category name')
          })
        )
        .describe('Available task and event categories')
    })
  )
  .handleInvocation(async ctx => {
    let categories = await new Client(ctx.auth).listEventCategories();
    return {
      output: {
        categories: categories.map(category => ({
          categoryId: category.id,
          name: category.name ?? null
        }))
      },
      message: `Found **${categories.length}** event categories`
    };
  })
  .build();
