import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let getCollectionItem = SlateTool.create(spec, {
  name: 'Get Collection Item',
  key: 'get_collection_item',
  description: `Retrieve one CMS collection item by ID from the staged or live collection item endpoint. Use this to inspect field data before updating, publishing, or deleting a CMS item.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('Unique identifier of the CMS collection'),
      itemId: z.string().describe('Unique identifier of the CMS item'),
      live: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, retrieve the live published item instead of the staged item')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique identifier for the item'),
      fieldData: z.record(z.string(), z.any()).optional().describe('Field data of the item'),
      isArchived: z.boolean().optional().describe('Whether the item is archived'),
      isDraft: z.boolean().optional().describe('Whether the item is a draft'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
      lastPublished: z.string().optional().describe('ISO 8601 last publish timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let item = ctx.input.live
      ? await client.getCollectionItemLive(ctx.input.collectionId, ctx.input.itemId)
      : await client.getCollectionItem(ctx.input.collectionId, ctx.input.itemId);

    return {
      output: {
        itemId: item.id ?? ctx.input.itemId,
        fieldData: item.fieldData,
        isArchived: item.isArchived,
        isDraft: item.isDraft,
        createdOn: item.createdOn,
        lastUpdated: item.lastUpdated,
        lastPublished: item.lastPublished
      },
      message: `Retrieved ${ctx.input.live ? 'live' : 'staged'} collection item **${item.id ?? ctx.input.itemId}**.`
    };
  })
  .build();
