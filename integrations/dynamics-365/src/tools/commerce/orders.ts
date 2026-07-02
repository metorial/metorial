import { commerceOrderOperationInputSchema } from '@slates/dynamics-commerce-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import {
  buildDocumentedGetOrderBySalesIdRequest,
  buildDocumentedGetOrderByTransactionIdRequest
} from './retail-server-requests';
import {
  assertPrimitiveAdditionalFields,
  buildCommerceToolOutput,
  commerceMessage,
  commerceResultOutputSchema,
  createCommerceClient,
  requireConfirmedWrite,
  requireNonEmptyRecord
} from './shared';

let orderInputSchema = commerceOrderOperationInputSchema.extend({
  confirmWrite: z
    .boolean()
    .optional()
    .describe('Must be true for create because it writes a Commerce sales order.'),
  searchLocationValue: z
    .number()
    .int()
    .optional()
    .describe(
      'Required for get_by_transaction_id. Commerce SearchLocation enum value that scopes where sales orders are searched.'
    )
});

export let manageOrders = SlateTool.create(spec, {
  name: 'Manage Commerce Orders',
  key: 'manage_orders',
  description:
    'Search Dynamics 365 Commerce sales orders, retrieve orders by transaction id or sales id, and conservatively create sales orders through Retail Server.',
  constraints: [
    'Sales order creation requires confirmWrite=true.',
    'Create only draft/safe sales order payloads that are intended for the target Commerce environment.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(orderInputSchema)
  .output(commerceResultOutputSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      requireConfirmedWrite(ctx.input.confirmWrite, ctx.input.action, 'orders');
      requireNonEmptyRecord(ctx.input.salesOrder, 'salesOrder');
      assertPrimitiveAdditionalFields(ctx.input.additionalFields);
    }

    let client = createCommerceClient(ctx);
    let result: unknown;
    let collection = false;

    switch (ctx.input.action) {
      case 'search':
        result = await client.searchOrders(ctx.input);
        collection = true;
        break;
      case 'get_by_transaction_id':
        result = await client.execute(
          buildDocumentedGetOrderByTransactionIdRequest(ctx.input)
        );
        break;
      case 'get_by_sales_id':
        result = await client.execute(buildDocumentedGetOrderBySalesIdRequest(ctx.input));
        break;
      case 'create':
        result = await client.createSalesOrder(ctx.input as any);
        break;
    }

    let output = buildCommerceToolOutput(ctx.input.action, result, {
      collection,
      pageInput: collection ? ctx.input : undefined
    });

    return {
      output,
      message: commerceMessage('Commerce orders', ctx.input.action, output)
    };
  })
  .build();
