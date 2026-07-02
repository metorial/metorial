import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteCollection = SlateTool.create(spec, {
  name: 'Delete Collection',
  key: 'delete_collection',
  description: `Permanently delete a collection and all its objects from the Weaviate instance. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the collection was deleted'),
      collectionName: z.string().describe('Name of the deleted collection')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteCollection(ctx.input.collectionName);
    return {
      output: {
        deleted: true,
        collectionName: ctx.input.collectionName
      },
      message: `Deleted collection **${ctx.input.collectionName}** and all its objects.`
    };
  })
  .build();
