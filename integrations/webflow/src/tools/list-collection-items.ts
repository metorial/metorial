import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let itemSchema = z.object({
  itemId: z.string().describe('Unique identifier for the item'),
  fieldData: z.record(z.string(), z.any()).optional().describe('Field data of the item'),
  isArchived: z.boolean().optional().describe('Whether the item is archived'),
  isDraft: z.boolean().optional().describe('Whether the item is a draft'),
  createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
  lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
  lastPublished: z.string().optional().describe('ISO 8601 last publish timestamp')
});

export let listCollectionItems = SlateTool.create(spec, {
  name: 'List Collection Items',
  key: 'list_collection_items',
  description: `List CMS collection items (staged or live). Returns items with their field data and metadata. Use the "live" flag to fetch published items instead of staged/draft items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('Unique identifier of the CMS collection'),
      live: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, return live (published) items instead of staged items'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of items to return (max 100)'),
      sortBy: z.string().optional().describe('Field slug to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('List of collection items'),
      pagination: z
        .object({
          offset: z.number().optional(),
          limit: z.number().optional(),
          total: z.number().optional()
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let { collectionId, live, offset, limit, sortBy, sortOrder } = ctx.input;
    let params = { offset, limit, sortBy, sortOrder };

    let data = live
      ? await client.listCollectionItemsLive(collectionId, params)
      : await client.listCollectionItems(collectionId, params);

    let items = (data.items ?? []).map((i: any) => ({
      itemId: i.id,
      fieldData: i.fieldData,
      isArchived: i.isArchived,
      isDraft: i.isDraft,
      createdOn: i.createdOn,
      lastUpdated: i.lastUpdated,
      lastPublished: i.lastPublished
    }));

    return {
      output: {
        items,
        pagination: data.pagination
      },
      message: `Found **${items.length}** ${live ? 'live' : 'staged'} item(s) in collection **${collectionId}**.`
    };
  })
  .build();
