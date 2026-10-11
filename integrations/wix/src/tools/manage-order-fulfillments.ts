import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

let findFulfillment = (result: Record<string, any>, fulfillmentId?: string) =>
  fulfillmentId
    ? (result.orderWithFulfillments?.fulfillments || []).find(
        (fulfillment: Record<string, any>) => fulfillment?.id === fulfillmentId
      )
    : undefined;

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
        .describe('Order ID and all of its fulfillment records after the operation'),
      fulfillmentId: z
        .string()
        .optional()
        .describe('ID of the created or updated fulfillment'),
      fulfillment: z.any().optional().describe('Created or updated fulfillment record'),
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
        let fulfillmentId: string | undefined = result.fulfillmentId;
        return {
          output: {
            fulfillmentId,
            fulfillment: findFulfillment(result, fulfillmentId),
            orderWithFulfillments: result.orderWithFulfillments,
            result
          },
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
          output: {
            fulfillmentId: ctx.input.fulfillmentId,
            fulfillment: findFulfillment(result, ctx.input.fulfillmentId),
            orderWithFulfillments: result.orderWithFulfillments,
            result
          },
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
          output: { orderWithFulfillments: result.orderWithFulfillments, result },
          message: `Deleted fulfillment **${ctx.input.fulfillmentId}** for order **${ctx.input.orderId}**`
        };
      }
    }
  })
  .build();
