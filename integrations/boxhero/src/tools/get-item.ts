import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { itemSchema, mapItem } from '../lib/schemas';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description:
    'Retrieve one inventory item by ID with custom attributes and per-location stock. Call list_items to discover item IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      itemId: z.number().describe('Item ID from list_items'),
      locationIds: z
        .array(z.number())
        .optional()
        .describe('Scope stock quantities to location IDs from list_locations')
    })
  )
  .output(z.object({ item: itemSchema }))
  .handleInvocation(async ctx => {
    let item = await new Client({ token: ctx.auth.token }).getItem(
      ctx.input.itemId,
      ctx.input.locationIds
    );
    return {
      output: { item: mapItem(item) },
      message: `Retrieved item ${item.id}: ${item.name}.`
    };
  })
  .build();
