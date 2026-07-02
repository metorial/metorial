import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve all available event categories from CoinMarketCal. Categories represent types of events such as exchange listings, airdrops, hard forks, partnerships, and updates. Use the returned category IDs when filtering events with the Search Events tool.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            categoryId: z.number().describe('Unique identifier of the category'),
            name: z.string().describe('Name of the event category')
          })
        )
        .describe('List of all available event categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let categories = await client.getCategories();

    let mapped = categories.map(cat => ({
      categoryId: cat.id,
      name: cat.name
    }));

    let names = mapped.map(c => c.name).join(', ');
    return {
      output: { categories: mapped },
      message: `Retrieved **${mapped.length}** event categories: ${names}.`
    };
  })
  .build();
