import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCollection = SlateTool.create(spec, {
  name: 'Delete Collection',
  key: 'delete_collection',
  description: `Permanently deletes a Qdrant collection and all its data. This action cannot be undone.`,
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
      collectionName: z.string().describe('Name of the deleted collection'),
      success: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    await client.deleteCollection(ctx.input.collectionName);

    return {
      output: {
        collectionName: ctx.input.collectionName,
        success: true
      },
      message: `Collection \`${ctx.input.collectionName}\` has been deleted.`
    };
  })
  .build();
