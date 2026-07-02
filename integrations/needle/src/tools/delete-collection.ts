import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCollection = SlateTool.create(spec, {
  name: 'Delete Collection',
  key: 'delete_collection',
  description: `Permanently delete a collection and all its indexed files. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the collection was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    await client.deleteCollection(ctx.input.collectionId);

    return {
      output: { deleted: true },
      message: `Deleted collection \`${ctx.input.collectionId}\`.`
    };
  })
  .build();
