import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';
import { mapOrderSummary, orderSummaryOutputSchema } from './shared';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description:
    'Update an open Square order using sparse order fields and the current order version. Use fieldsToClear to clear supported dot-notation fields.',
  tags: { destructive: false }
})
  .input(
    z.object({
      orderId: z.string().describe('The ID of the order to update'),
      version: z.number().describe('Current order version for optimistic concurrency'),
      lineItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Replacement sparse line_items for the order'),
      taxes: z.array(z.record(z.string(), z.any())).optional().describe('Replacement taxes'),
      discounts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Replacement discounts'),
      fulfillments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Replacement fulfillment details'),
      customerId: z.string().optional().describe('Updated customer ID for the order'),
      referenceId: z.string().optional().describe('Updated custom reference ID'),
      fieldsToClear: z
        .array(z.string())
        .optional()
        .describe('Square dot-notation paths to clear, e.g. discounts'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate updates. Auto-generated if omitted')
    })
  )
  .output(orderSummaryOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let order = await client.updateOrder(ctx.input.orderId, {
      order: {
        id: ctx.input.orderId,
        version: ctx.input.version,
        line_items: ctx.input.lineItems,
        taxes: ctx.input.taxes,
        discounts: ctx.input.discounts,
        fulfillments: ctx.input.fulfillments,
        customer_id: ctx.input.customerId,
        reference_id: ctx.input.referenceId
      },
      fieldsToClear: ctx.input.fieldsToClear,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });
    let output = mapOrderSummary(order);

    return {
      output,
      message: `Order **${output.orderId}** updated. Version: **${output.version ?? 'N/A'}**`
    };
  })
  .build();
