import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let publishCollectionItems = SlateTool.create(spec, {
  name: 'Publish Collection Items',
  key: 'publish_collection_items',
  description: `Publish one or more staged CMS collection items to make them live. This pushes draft changes to the published version of the items.`
})
  .input(
    z.object({
      collectionId: z.string().describe('Unique identifier of the CMS collection'),
      itemIds: z.array(z.string()).min(1).describe('Array of collection item IDs to publish')
    })
  )
  .output(
    z.object({
      publishedItemIds: z.array(z.string()).describe('IDs of the items that were published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    await client.publishCollectionItems(ctx.input.collectionId, ctx.input.itemIds);

    return {
      output: { publishedItemIds: ctx.input.itemIds },
      message: `Published **${ctx.input.itemIds.length}** item(s) in collection **${ctx.input.collectionId}**.`
    };
  })
  .build();
