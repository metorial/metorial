import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let addOrderPayment = SlateTool.create(spec, {
  name: 'Add Order Payment',
  key: 'add_order_payment',
  description: `Record a payment on a BaseLinker order. Sets the paid amount and optionally the payment date and a comment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('Order ID to record payment for'),
      paymentDone: z.number().describe('Amount paid'),
      paymentDate: z.number().optional().describe('Payment date as unix timestamp'),
      paymentComment: z.string().optional().describe('Payment comment or reference')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the payment was recorded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    await client.setOrderPayment({
      orderId: ctx.input.orderId,
      paymentDone: ctx.input.paymentDone,
      paymentDate: ctx.input.paymentDate,
      paymentComment: ctx.input.paymentComment
    });

    return {
      output: { success: true },
      message: `Recorded payment of **${ctx.input.paymentDone}** on order **#${ctx.input.orderId}**.`
    };
  })
  .build();
