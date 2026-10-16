import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient, requireRecord } from '../lib/client';
import { spec } from '../spec';

export let getCollection = SlateTool.create(spec, {
  key: 'get_collection',
  name: 'Get Collection',
  description:
    'Retrieve a collection, including its schedule, status, request count, request page count, and result-set count. Call list_collections to discover collection IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({ collectionId: z.string().describe('Collection ID from list_collections.') })
  )
  .output(
    z.object({
      collection: z
        .record(z.string(), z.any())
        .describe('Complete collection settings and state.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new CountdownClient(ctx.auth).getCollection(ctx.input.collectionId);
    return {
      output: { collection: requireRecord(result.collection, 'collection') },
      message: 'Retrieved collection details.'
    };
  })
  .build();
