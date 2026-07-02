import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageOrderFulfillments = SlateTool.create(spec, {
  name: 'Manage Order Fulfillments',
  key: 'manage_order_fulfillments',
  description: `List, create, update, or delete fulfillment records for Wix eCommerce orders.
Use **action** to specify the operation: \`list\`, \`create\`, \`update\`, or \`delete\`.
Fulfillments track delivery of specific line items and optional tracking information.`,
  instructions: [
    'Create fulfillments only for approved orders with fulfillable line items.',
    'fulfillmentData should match the Wix Order Fulfillments API fulfillment object, including lineItems and optional trackingInfo.',
    'Use list first when you need existing fulfillment IDs for update or delete.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      orderId: z.string().describe('Wix order ID'),
      fulfillmentId: z
        .string()
        .optional()
        .describe('Fulfillment ID (required for update and delete)'),
      fulfillmentData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Fulfillment object for create/update, including lineItems and optional trackingInfo.'
        )
    })
  )
  .output(
    z.object({
      orderWithFulfillments: z
        .any()
        .optional()
        .describe('Order and fulfillment records returned by list'),
      fulfillment: z.any().optional().describe('Single fulfillment response'),
      result: z.any().optional().describe('Raw Wix fulfillment response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listFulfillments(ctx.input.orderId);
        let fulfillments = result.orderWithFulfillments?.fulfillments || [];
        return {
          output: { orderWithFulfillments: result.orderWithFulfillments, result },
          message: `Found **${fulfillments.length}** fulfillments for order **${ctx.input.orderId}**`
        };
      }
      case 'create': {
        if (!ctx.input.fulfillmentData) {
          throw createApiServiceError('fulfillmentData is required for create action');
        }
        let result = await client.createFulfillment(
          ctx.input.orderId,
          ctx.input.fulfillmentData
        );
        return {
          output: { fulfillment: result.fulfillment, result },
          message: `Created fulfillment for order **${ctx.input.orderId}**`
        };
      }
      case 'update': {
        if (!ctx.input.fulfillmentId) {
          throw createApiServiceError('fulfillmentId is required for update action');
        }
        if (!ctx.input.fulfillmentData) {
          throw createApiServiceError('fulfillmentData is required for update action');
        }
        let result = await client.updateFulfillment(
          ctx.input.orderId,
          ctx.input.fulfillmentId,
          ctx.input.fulfillmentData
        );
        return {
          output: { fulfillment: result.fulfillment, result },
          message: `Updated fulfillment **${ctx.input.fulfillmentId}** for order **${ctx.input.orderId}**`
        };
      }
      case 'delete': {
        if (!ctx.input.fulfillmentId) {
          throw createApiServiceError('fulfillmentId is required for delete action');
        }
        let result = await client.deleteFulfillment(
          ctx.input.orderId,
          ctx.input.fulfillmentId
        );
        return {
          output: { result },
          message: `Deleted fulfillment **${ctx.input.fulfillmentId}** for order **${ctx.input.orderId}**`
        };
      }
    }
  })
  .build();
