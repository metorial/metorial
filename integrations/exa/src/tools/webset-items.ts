import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

let itemSchema = z.object({
  itemId: z.string().describe('Item identifier'),
  status: z.string().describe('Item status'),
  url: z.string().describe('Source URL'),
  title: z.string().optional().describe('Item title'),
  source: z.string().optional().describe('Item source'),
  properties: z.record(z.string(), z.unknown()).optional().describe('Item properties'),
  enrichments: z.record(z.string(), z.unknown()).optional().describe('Enrichment results'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listWebsetItemsTool = SlateTool.create(spec, {
  name: 'List Webset Items',
  key: 'list_webset_items',
  description: `List items in a Webset. Each item represents a web entity found and verified by Exa's search agents.
Items include source URLs, properties, and enrichment results. Supports cursor-based pagination and status filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID to list items from'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Maximum number of items to return'),
      status: z.string().optional().describe('Filter by item status')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('Webset items'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let result = await client.listWebsetItems(ctx.input.websetId, {
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      status: ctx.input.status
    });

    let items = result.data.map(item => ({
      itemId: item.id,
      status: item.status,
      url: item.url,
      title: item.title,
      source: item.source,
      properties: item.properties,
      enrichments: item.enrichments,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return {
      output: {
        items,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      },
      message: `Found **${items.length}** item(s) in Webset **${ctx.input.websetId}**.${result.hasMore ? ' More items available.' : ''}`
    };
  })
  .build();

export let getWebsetItemTool = SlateTool.create(spec, {
  name: 'Get Webset Item',
  key: 'get_webset_item',
  description: `Retrieve a specific item from a Webset by its ID, including all properties and enrichment results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID'),
      itemId: z.string().describe('The item ID to retrieve')
    })
  )
  .output(itemSchema)
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let item = await client.getWebsetItem(ctx.input.websetId, ctx.input.itemId);

    return {
      output: {
        itemId: item.id,
        status: item.status,
        url: item.url,
        title: item.title,
        source: item.source,
        properties: item.properties,
        enrichments: item.enrichments,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      },
      message: `Retrieved item **${item.id}** from Webset **${ctx.input.websetId}** — ${item.url}.`
    };
  })
  .build();

export let deleteWebsetItemTool = SlateTool.create(spec, {
  name: 'Delete Webset Item',
  key: 'delete_webset_item',
  description: `Remove a specific item from a Webset.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID'),
      itemId: z.string().describe('The item ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    await client.deleteWebsetItem(ctx.input.websetId, ctx.input.itemId);

    return {
      output: { deleted: true },
      message: `Deleted item **${ctx.input.itemId}** from Webset **${ctx.input.websetId}**.`
    };
  })
  .build();
