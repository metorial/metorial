import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageOrders = SlateTool.create(spec, {
  name: 'Manage Orders',
  key: 'manage_orders',
  description: `Search, retrieve, create, or update eCommerce orders on a Wix site.
Use **action** to specify the operation: \`get\`, \`search\`, \`create\`, \`update\`, or \`cancel\`.
Orders contain purchase details, line items, pricing, shipping/billing info, payment and fulfillment status.`,
  instructions: [
    'The "search" action supports free-text search and filters using the Wix Query Language.',
    'For "update", only specific fields can be updated (contact info, addresses, metadata). To modify line items use Draft Orders.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'search', 'create', 'update', 'cancel'])
        .describe('Operation to perform'),
      orderId: z.string().optional().describe('Order ID (required for get, update, cancel)'),
      cancelReason: z.string().optional().describe('Reason for cancel action'),
      searchExpression: z
        .string()
        .optional()
        .describe('Free-text search expression (for search)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object for search action'),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification for search action'),
      limit: z.number().optional().describe('Max items to return (for search, default 50)'),
      offset: z.number().optional().describe('Number of items to skip (for search)'),
      orderData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Order data (for create/update). For create, include lineItems, billingInfo, channelInfo, etc.'
        )
    })
  )
  .output(
    z.object({
      order: z.any().optional().describe('Single order data'),
      orders: z.array(z.any()).optional().describe('List of orders'),
      cancellation: z.any().optional().describe('Cancellation response data'),
      totalResults: z.number().optional().describe('Total number of matching orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.orderId)
          throw createApiServiceError('orderId is required for get action');
        let result = await client.getOrder(ctx.input.orderId);
        return {
          output: { order: result.order },
          message: `Retrieved order **${ctx.input.orderId}** (status: ${result.order?.status || 'unknown'})`
        };
      }
      case 'search': {
        let result = await client.searchOrders({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          paging: { limit: ctx.input.limit, offset: ctx.input.offset },
          search: ctx.input.searchExpression
            ? { expression: ctx.input.searchExpression }
            : undefined
        });
        let orders = result.orders || [];
        return {
          output: { orders, totalResults: result.totalResults },
          message: `Found **${orders.length}** orders${result.totalResults ? ` out of ${result.totalResults} total` : ''}`
        };
      }
      case 'create': {
        if (!ctx.input.orderData)
          throw createApiServiceError('orderData is required for create action');
        let result = await client.createOrder(ctx.input.orderData);
        return {
          output: { order: result.order },
          message: `Created order **${result.order?.id}**`
        };
      }
      case 'update': {
        if (!ctx.input.orderId)
          throw createApiServiceError('orderId is required for update action');
        if (!ctx.input.orderData)
          throw createApiServiceError('orderData is required for update action');
        let result = await client.updateOrder(ctx.input.orderId, ctx.input.orderData);
        return {
          output: { order: result.order },
          message: `Updated order **${ctx.input.orderId}**`
        };
      }
      case 'cancel': {
        if (!ctx.input.orderId)
          throw createApiServiceError('orderId is required for cancel action');
        let result = await client.cancelOrder(ctx.input.orderId, ctx.input.cancelReason);
        return {
          output: { order: result.order, cancellation: result },
          message: `Canceled order **${ctx.input.orderId}**`
        };
      }
    }
  })
  .build();
