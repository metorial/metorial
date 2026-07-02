import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCategoriesTool = SlateTool.create(spec, {
  name: 'Get Categories',
  key: 'get_categories',
  description: `Retrieve the list of available event categories (e.g., Business, Music, Conferences, Training) used for organizing and filtering events.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z.array(z.string()).describe('List of available event category names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getCategories();

    let rawCategories = Array.isArray(data?.categories)
      ? data.categories
      : Array.isArray(data)
        ? data
        : [];
    let categories = rawCategories.map((c: any) => (typeof c === 'string' ? c : c.category));

    return {
      output: { categories },
      message: `Found **${categories.length}** event categories.`
    };
  })
  .build();
