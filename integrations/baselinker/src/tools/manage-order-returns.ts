import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let manageOrderReturns = SlateTool.create(spec, {
  name: 'Manage Order Returns',
  key: 'manage_order_returns',
  description: `Create, update, list, or delete order returns in BaseLinker. Use **list** to retrieve returns (with optional date/order filtering), **create** to initiate a new return for an order, **update** to modify return details, or **delete** to remove a return.`,
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
      reasonId: z.number().optional().describe('Return reason ID (create/update)'),
      adminComments: z
        .string()
        .optional()
        .describe('Admin comments for the return (create/update)'),
      products: z
        .array(
          z.object({
            orderProductId: z.number().describe('Order product ID to return'),
            quantity: z.number().describe('Quantity to return')
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
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.getOrderReturns({
        orderId: ctx.input.orderId,
        dateFrom: ctx.input.dateFrom,
        idFrom: ctx.input.idFrom
      });

      let returns = result.order_returns || result.returns || [];

      return {
        output: { returns, success: true },
        message: `Retrieved **${Array.isArray(returns) ? returns.length : Object.keys(returns).length}** order return(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.addOrderReturn({
        orderId: ctx.input.orderId!,
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
