import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteItem = SlateTool.create(spec, {
  name: 'Delete Item',
  key: 'delete_item',
  description: `Permanently delete an item (product) from the Gift Up! checkout. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      itemId: z.string().describe('ID of the item to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the item was successfully deleted'),
      itemId: z.string().describe('ID of the deleted item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    await client.deleteItem(ctx.input.itemId);

    return {
      output: { deleted: true, itemId: ctx.input.itemId },
      message: `Deleted item **${ctx.input.itemId}**`
    };
  })
  .build();
