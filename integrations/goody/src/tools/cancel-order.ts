import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

export let cancelOrder = SlateTool.create(spec, {
  name: 'Cancel Order',
  key: 'cancel_order',
  description: `Cancel a gift order. Only orders in "created", "notified", or "opened" status can be canceled.`,
  constraints: ['Can only cancel orders with status: created, notified, or opened.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to cancel')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Canceled order ID'),
      status: z.string().describe('Updated order status'),
      recipientFirstName: z.string().describe('Recipient first name'),
      recipientLastName: z.string().nullable().describe('Recipient last name'),
      referenceId: z.string().describe('Display reference ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let o = await client.cancelOrder(ctx.input.orderId);

    return {
      output: {
        orderId: o.id,
        status: o.status,
        recipientFirstName: o.recipient_first_name,
        recipientLastName: o.recipient_last_name,
        referenceId: o.reference_id
      },
      message: `Order **${o.reference_id}** for **${o.recipient_first_name}** has been canceled.`
    };
  })
  .build();
