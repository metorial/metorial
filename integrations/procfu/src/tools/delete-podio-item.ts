import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let deletePodioItem = SlateTool.create(spec, {
  name: 'Delete Podio Item',
  key: 'delete_podio_item',
  description: `Permanently delete a Podio item by its ID. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      podioItemId: z.string().describe('The Podio item ID to delete')
    })
  )
  .output(
    z.object({
      podioItemId: z.string().describe('The ID of the deleted Podio item'),
      result: z.any().describe('The deletion response from ProcFu')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let result = await client.deleteItem(ctx.input.podioItemId);

    return {
      output: {
        podioItemId: ctx.input.podioItemId,
        result
      },
      message: `Deleted Podio item **${ctx.input.podioItemId}**.`
    };
  })
  .build();
