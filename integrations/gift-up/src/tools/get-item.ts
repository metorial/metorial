import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  key: 'get_item',
  name: 'Get Item',
  description:
    'Retrieve an item and its pricing, balances, stock, codes, availability, and expiry settings. Call list_items to discover item IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ itemId: z.string().describe('Item ID from list_items') }))
  .output(z.object({ id: z.string(), itemId: z.string(), name: z.string() }).passthrough())
  .handleInvocation(async ctx => {
    let item = await new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    }).getItem(ctx.input.itemId);
    return { output: { ...item, itemId: item.id }, message: `Retrieved item ${item.name}.` };
  })
  .build();
