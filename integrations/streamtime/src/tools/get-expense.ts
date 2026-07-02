import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getExpense = SlateTool.create(spec, {
  name: 'Get Expense',
  key: 'get_expense',
  description: `Retrieve a logged expense by its ID, including details and optionally the associated purchase order and its line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      expenseId: z.number().describe('ID of the expense to retrieve'),
      includePurchaseOrder: z
        .boolean()
        .optional()
        .describe('Also fetch the associated purchase order'),
      includePurchaseOrderLineItems: z
        .boolean()
        .optional()
        .describe('Also fetch purchase order line items')
    })
  )
  .output(
    z.object({
      expenseId: z.number().describe('ID of the expense'),
      raw: z.record(z.string(), z.any()).describe('Full expense object'),
      purchaseOrder: z
        .record(z.string(), z.any())
        .optional()
        .describe('Associated purchase order if requested'),
      purchaseOrderLineItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Purchase order line items if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let expense = await client.getLoggedExpense(ctx.input.expenseId);

    let output: Record<string, any> = {
      expenseId: expense.id,
      raw: expense
    };

    if (ctx.input.includePurchaseOrder) {
      try {
        output.purchaseOrder = await client.getExpensePurchaseOrder(ctx.input.expenseId);
      } catch {
        output.purchaseOrder = undefined;
      }
    }
    if (ctx.input.includePurchaseOrderLineItems) {
      try {
        output.purchaseOrderLineItems = await client.listExpensePurchaseOrderLineItems(
          ctx.input.expenseId
        );
      } catch {
        output.purchaseOrderLineItems = undefined;
      }
    }

    return {
      output: output as any,
      message: `Retrieved expense (ID: ${expense.id}).`
    };
  })
  .build();
