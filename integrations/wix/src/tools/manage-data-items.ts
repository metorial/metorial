import { SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDataItems = SlateTool.create(spec, {
  name: 'Manage CMS Data',
  key: 'manage_data_items',
  description: `Create, read, update, or delete items in Wix CMS data collections.
Use **action** to specify the operation: \`get\`, \`list\`, \`create\`, \`update\`, or \`delete\`.
Works with any Wix content management database collection by specifying the collection ID.`,
  instructions: [
    'The collectionId must match an existing Wix CMS data collection.',
    'Item data is a flexible key-value object that matches the collection schema.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      collectionId: z.string().describe('CMS data collection ID'),
      itemId: z.string().optional().describe('Item ID (required for get, update, delete)'),
      itemData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Item data as key-value pairs matching the collection schema (for create/update)'
        ),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object for list action'),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification for list action'),
      limit: z.number().optional().describe('Max items to return (default 50)'),
      offset: z.number().optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      dataItem: z.any().optional().describe('Single data item'),
      dataItems: z.array(z.any()).optional().describe('List of data items'),
      totalResults: z.number().optional().describe('Total number of matching items')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.itemId) throw new Error('itemId is required for get action');
        let result = await client.getDataItem(ctx.input.collectionId, ctx.input.itemId);
        return {
          output: { dataItem: result.dataItem },
          message: `Retrieved data item **${ctx.input.itemId}** from collection **${ctx.input.collectionId}**`
        };
      }
      case 'list': {
        let result = await client.queryDataItems(ctx.input.collectionId, {
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          paging: { limit: ctx.input.limit, offset: ctx.input.offset }
        });
        let dataItems = result.dataItems || [];
        return {
          output: { dataItems, totalResults: result.pagingMetadata?.total },
          message: `Found **${dataItems.length}** items in collection **${ctx.input.collectionId}**`
        };
      }
      case 'create': {
        if (!ctx.input.itemData) throw new Error('itemData is required for create action');
        let result = await client.insertDataItem(ctx.input.collectionId, ctx.input.itemData);
        return {
          output: { dataItem: result.dataItem },
          message: `Created item in collection **${ctx.input.collectionId}** (ID: ${result.dataItem?._id || result.dataItem?.id})`
        };
      }
      case 'update': {
        if (!ctx.input.itemId) throw new Error('itemId is required for update action');
        if (!ctx.input.itemData) throw new Error('itemData is required for update action');
        let result = await client.updateDataItem(
          ctx.input.collectionId,
          ctx.input.itemId,
          ctx.input.itemData
        );
        return {
          output: { dataItem: result.dataItem },
          message: `Updated item **${ctx.input.itemId}** in collection **${ctx.input.collectionId}**`
        };
      }
      case 'delete': {
        if (!ctx.input.itemId) throw new Error('itemId is required for delete action');
        await client.deleteDataItem(ctx.input.collectionId, ctx.input.itemId);
        return {
          output: {},
          message: `Deleted item **${ctx.input.itemId}** from collection **${ctx.input.collectionId}**`
        };
      }
    }
  })
  .build();
