import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';
import { mapOrderSummary, orderSummaryOutputSchema } from './shared';

export let payOrder = SlateTool.create(spec, {
  name: 'Pay Order',
  key: 'pay_order',
  description:
    'Mark a Square order as paid using approved delayed-capture payment IDs, or settle a zero-total order with an empty paymentIds array.',
  tags: { destructive: false }
})
  .input(
    z.object({
      orderId: z.string().describe('The ID of the order to pay'),
      paymentIds: z
        .array(z.string())
        .optional()
        .describe(
          'Approved payment IDs to collect. Use an empty array for a zero-total order.'
        ),
      orderVersion: z
        .number()
        .optional()
        .describe('Order version to pay; latest is used if omitted'),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Unique key to prevent duplicate payment attempts. Auto-generated if omitted'
        )
    })
  )
  .output(orderSummaryOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let order = await client.payOrder(ctx.input.orderId, {
      paymentIds: ctx.input.paymentIds,
      orderVersion: ctx.input.orderVersion,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });
    let output = mapOrderSummary(order);

    return {
      output,
      message: `Order **${output.orderId}** payment applied. State: **${output.state}**`
    };
  })
  .build();
