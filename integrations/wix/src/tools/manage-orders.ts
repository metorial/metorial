import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getNextCursor } from '../lib/client';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageOrders = SlateTool.create(spec, {
  name: 'Manage Orders',
  key: 'manage_orders',
  description: `Search, retrieve, create, or update eCommerce orders on a Wix site.
Use **action** to specify the operation: \`get\`, \`search\`, \`create\`, \`update\`, or \`cancel\`.
Orders contain purchase details, line items, pricing, shipping/billing info, payment and fulfillment status.`,
  instructions: [
    'The "search" action filters with the Wix API Query Language, for example {"status": "APPROVED", "buyerInfo.email": {"$startsWith": "jane"}}. Results are sorted by createdDate descending by default.',
    'Search does not return PENDING or REJECTED orders unless you filter for that status explicitly.',
    'Search uses cursor paging: pass nextCursor from the previous response as cursor to get the next page.',
    'For "create", orderData is the Wix order object (lineItems, channelInfo, priceSummary, billingInfo, and so on).',
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
      cancelReason: z
        .string()
        .optional()
        .describe('Custom note added to the cancellation email (for cancel)'),
      sendCancellationEmail: z
        .boolean()
        .optional()
        .describe('Whether to email the buyer that the order was canceled (for cancel)'),
      restockAllItems: z
        .boolean()
        .optional()
        .describe('Whether to restock all items of the canceled order (for cancel)'),
      searchExpression: z
        .string()
        .optional()
        .describe(
          'Not supported by Wix order search; use filter instead (for example on buyerInfo.email or number).'
        ),
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
      limit: z.number().optional().describe('Max items to return (for search, max 100)'),
      offset: z
        .number()
        .optional()
        .describe('Not supported by Wix order search; use cursor instead.'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from a previous nextCursor to get the next page (for search)'),
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
      totalResults: z
        .number()
        .optional()
        .describe('Total number of matching orders, when Wix reports it'),
      nextCursor: z.string().optional().describe('Cursor for the next page of search results')
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
        if (ctx.input.searchExpression !== undefined) {
          throw createApiServiceError(
            'Wix order search does not support free-text search. Use filter instead, for example {"buyerInfo.email": {"$startsWith": "jane"}} or {"number": 10042}.'
          );
        }
        if (ctx.input.offset !== undefined) {
          throw createApiServiceError(
            'Wix order search uses cursor paging. Remove offset and pass cursor from nextCursor instead.'
          );
        }
        let result = await client.searchOrders({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        });
        let orders = result.orders || [];
        let nextCursor = getNextCursor(result);
        return {
          output: { orders, nextCursor },
          message: `Found **${orders.length}** orders${nextCursor ? ' (more available)' : ''}`
        };
      }
      case 'create': {
        if (!ctx.input.orderData)
          throw createApiServiceError('orderData is required for create action');
        let body =
          ctx.input.orderData.order && typeof ctx.input.orderData.order === 'object'
            ? ctx.input.orderData
            : { order: ctx.input.orderData };
        let result = await client.createOrder(body);
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
        let result = await client.cancelOrder(ctx.input.orderId, {
          customMessage: ctx.input.cancelReason,
          sendOrderCanceledEmail: ctx.input.sendCancellationEmail,
          restockAllItems: ctx.input.restockAllItems
        });
        return {
          output: { order: result.order, cancellation: result },
          message: `Canceled order **${ctx.input.orderId}**`
        };
      }
    }
  })
  .build();
