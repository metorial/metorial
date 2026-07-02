import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCollection = SlateTool.create(spec, {
  name: 'Delete Collection',
  key: 'delete_collection',
  description: `Permanently delete a collection from your Mem knowledge base by its ID. Notes within the collection are not deleted.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('The UUID of the collection to delete.')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('The request ID confirming the deletion.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.deleteCollection(ctx.input.collectionId);

    return {
      output: {
        requestId: response.request_id
      },
      message: `Deleted collection \`${ctx.input.collectionId}\`.`
    };
  })
  .build();
