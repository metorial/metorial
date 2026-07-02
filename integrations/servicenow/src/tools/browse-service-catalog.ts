import { SlateTool } from 'slates';
import { z } from 'zod';
import { servicenowServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let browseServiceCatalog = SlateTool.create(spec, {
  name: 'Browse Service Catalog',
  key: 'browse_service_catalog',
  description: `Browse and retrieve service catalog items in ServiceNow. List available catalog items, view item details, or submit a catalog order. Use this to discover available services or programmatically order items.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'order'])
        .describe('Action: list catalog items, get item details, or order an item'),
      catalogItemId: z
        .string()
        .optional()
        .describe('sys_id of the catalog item (required for get and order actions)'),
      catalogId: z.string().optional().describe('sys_id of a specific catalog to filter by'),
      categoryId: z.string().optional().describe('sys_id of a specific category to filter by'),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Variable name-value pairs for ordering a catalog item'),
      limit: z.number().optional().default(20).describe('Maximum number of items to list'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of catalog items (for list action)'),
      item: z
        .record(z.string(), z.any())
        .optional()
        .describe('Catalog item details (for get action)'),
      orderResult: z
        .record(z.string(), z.any())
        .optional()
        .describe('Order result details (for order action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    if (ctx.input.action === 'list') {
      let items = await client.getCatalogItems({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        catalogId: ctx.input.catalogId,
        categoryId: ctx.input.categoryId
      });

      return {
        output: { items },
        message: `Found **${items.length}** service catalog items.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.catalogItemId) {
        throw servicenowServiceError('catalogItemId is required for get action');
      }
      let item = await client.getCatalogItem(ctx.input.catalogItemId);
      return {
        output: { item },
        message: `Retrieved catalog item: **${item?.name || ctx.input.catalogItemId}**`
      };
    }

    if (ctx.input.action === 'order') {
      if (!ctx.input.catalogItemId) {
        throw servicenowServiceError('catalogItemId is required for order action');
      }
      let orderResult = await client.orderCatalogItem(
        ctx.input.catalogItemId,
        ctx.input.variables || {}
      );
      return {
        output: { orderResult },
        message: `Submitted catalog order. Request number: **${orderResult?.number || orderResult?.sys_id || 'N/A'}**`
      };
    }

    throw servicenowServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
