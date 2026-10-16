import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { collectionSchema, mapCollection } from '../lib/schemas';
import { spec } from '../spec';

export let getCollection = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description:
    'Retrieve a curated gift collection, its sendable product ID, and the published categories and products recipients can select.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      collectionId: z.string().describe('Collection ID from list_collections')
    })
  )
  .output(collectionSchema)
  .handleInvocation(async ctx => {
    let collection = await createGoodyClient(ctx).getCollection(ctx.input.collectionId);
    return {
      output: mapCollection(collection),
      message: `Retrieved collection **${collection.title || collection.id}**.`
    };
  })
  .build();
