import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { itemSchema, mapItem } from '../lib/items';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve a single item (product) by its ID, including full variant details, pricing, and configuration.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the item to retrieve')
    })
  )
  .output(itemSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let item = await client.getItem(ctx.input.itemId);

    return {
      output: mapItem(item),
      message: `Retrieved item **${item.item_name}** with ${(item.variants ?? []).length} variant(s).`
    };
  })
  .build();
