import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let manageOrderReturns = SlateTool.create(spec, {
  name: 'Manage Order Returns',
  key: 'manage_order_returns',
  description: `Create, update, list, or delete order returns in BaseLinker. Use **list** to retrieve returns (with optional date/order filtering), **create** to initiate a new return for an order, **update** to modify return details, or **delete** to remove a return.`,
  instructions: [
    'For create, provide the documented statusId, dateAdd, currency and refunded fields. Discover statuses and reasons with get_order_return_options. The legacy update and delete modes retain their original request methods and need account-specific verification.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),

      // For list
      orderId: z
        .number()
        .optional()
        .describe('Order ID to filter returns (list) or to create return for (create)'),
      dateFrom: z
        .number()
        .optional()
        .describe('Filter returns created after this unix timestamp (list mode)'),
      idFrom: z
        .number()
        .optional()
        .describe('Fetch returns with ID greater than this (list mode, for pagination)'),

      // For create
      statusId: z
        .number()
        .optional()
        .describe(
          'Return status ID for create. Call get_order_return_options to discover IDs.'
        ),
      dateAdd: z.number().optional().describe('Return creation time in Unix seconds (create)'),
      currency: z.string().optional().describe('Three-letter currency code (create)'),
      refunded: z
        .boolean()
        .optional()
        .describe(
          'Whether already refunded; marks the return only and does not issue money (create)'
        ),
      reasonId: z
        .number()
        .optional()
        .describe(
          'Legacy return reason field (create/update); use products.returnReasonId for the documented item reason on create'
        ),
      adminComments: z
        .string()
        .optional()
        .describe('Admin comments for the return (create/update)'),
      products: z
        .array(
          z.object({
            orderProductId: z.number().describe('Order product ID to return'),
            quantity: z.number().describe('Quantity to return'),
            name: z.string().optional().describe('Product name'),
            sku: z.string().optional().describe('Product SKU'),
            storage: z
              .string()
              .optional()
              .describe('Product storage type: db, shop or warehouse'),
            storageId: z.number().optional().describe('Source storage ID'),
            variantId: z.number().optional().describe('Source variant ID'),
            ean: z.string().optional().describe('Product EAN'),
            location: z.string().optional().describe('Product location'),
            warehouseId: z
              .number()
              .optional()
              .describe('Internal warehouse ID from get_inventories with includeWarehouses'),
            attributes: z.string().optional().describe('Product variant attributes'),
            weight: z.number().optional().describe('Unit weight in kilograms'),
            productId: z.string().optional().describe('Product ID in source storage'),
            priceBrutto: z.number().optional().describe('Unit gross price'),
            taxRate: z
              .number()
              .optional()
              .describe('VAT tax rate, including supported exemption values'),
            returnReasonId: z
              .number()
              .optional()
              .describe('Return reason ID from get_order_return_options'),
            statusId: z.number().optional().describe('Return item status ID')
          })
        )
        .optional()
        .describe('Products to return with quantities (create)'),

      // For update/delete
      returnId: z.number().optional().describe('Return ID (required for update/delete)')
    })
  )
  .output(
    z.object({
      returns: z.any().optional().describe('List of returns (list mode)'),
      returnId: z.number().optional().describe('ID of created/affected return'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    if (['update', 'delete'].includes(ctx.input.action) && ctx.input.returnId === undefined) {
      throw createApiServiceError('returnId is required for update and delete.');
    }
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.getOrderReturns({
        orderId: ctx.input.orderId,
        dateFrom: ctx.input.dateFrom,
        idFrom: ctx.input.idFrom
      });

      let returns = result.order_returns !== undefined ? result.order_returns : result.returns;

      return {
        output: { returns, success: true },
        message: 'Retrieved the order returns response.'
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.addOrderReturn({
        orderId: ctx.input.orderId,
        statusId: ctx.input.statusId,
        dateAdd: ctx.input.dateAdd,
        currency: ctx.input.currency,
        refunded: ctx.input.refunded,
        reasonId: ctx.input.reasonId,
        adminComments: ctx.input.adminComments,
        products: ctx.input.products
      });

      return {
        output: { returnId: result.return_id, success: true },
        message: `Created return **#${result.return_id}** for order **#${ctx.input.orderId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      await client.updateOrderReturn({
        returnId: ctx.input.returnId!,
        adminComments: ctx.input.adminComments,
        reasonId: ctx.input.reasonId
      });

      return {
        output: { returnId: ctx.input.returnId, success: true },
        message: `Updated return **#${ctx.input.returnId}**.`
      };
    }

    // delete
    await client.deleteOrderReturn(ctx.input.returnId!);

    return {
      output: { returnId: ctx.input.returnId, success: true },
      message: `Deleted return **#${ctx.input.returnId}**.`
    };
  })
  .build();
