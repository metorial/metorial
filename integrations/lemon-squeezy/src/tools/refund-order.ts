import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let refundOrderTool = SlateTool.create(spec, {
  name: 'Refund Order',
  key: 'refund_order',
  description: `Issue a full or partial refund for an order. If no amount is specified, a full refund is issued.`,
  tags: {
    destructive: true
  },
  constraints: ['Refunds cannot be reversed once issued.']
})
  .input(
    z.object({
      orderId: z.string().describe('The ID of the order to refund'),
      amount: z
        .number()
        .optional()
        .describe('Partial refund amount in cents (omit for full refund)')
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      orderNumber: z.number(),
      status: z.string(),
      statusFormatted: z.string(),
      refunded: z.boolean(),
      refundedAt: z.string().nullable(),
      total: z.number(),
      totalFormatted: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.refundOrder(ctx.input.orderId, ctx.input.amount);
    let order = response.data;
    let attrs = order.attributes;

    return {
      output: {
        orderId: order.id,
        orderNumber: attrs.order_number,
        status: attrs.status,
        statusFormatted: attrs.status_formatted,
        refunded: attrs.refunded,
        refundedAt: attrs.refunded_at,
        total: attrs.total,
        totalFormatted: attrs.total_formatted
      },
      message: `Refund issued for order **#${attrs.order_number}** — ${ctx.input.amount ? `${ctx.input.amount} cents` : 'full refund'}.`
    };
  })
  .build();
