import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteItem = SlateTool.create(spec, {
  name: 'Delete Item',
  key: 'delete_item',
  description: `Delete an item (product) from the catalog by its ID. This is a permanent operation.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      itemId: z.string().describe('ID of the item to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteItem(ctx.input.itemId);

    return {
      output: { deleted: true },
      message: `Deleted item \`${ctx.input.itemId}\`.`
    };
  })
  .build();
