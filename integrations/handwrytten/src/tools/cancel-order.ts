import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelOrder = SlateTool.create(spec, {
  name: 'Cancel Order',
  key: 'cancel_order',
  description:
    'Cancel a paid order before processing starts. Orders that have already been processed cannot be canceled. Check get_order for the current status.',
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({ orderId: z.string().describe('ID of the paid order to cancel') }))
  .output(
    z.object({
      orderId: z.string(),
      result: z
        .record(z.string(), z.unknown())
        .describe('Cancellation response returned by Handwrytten')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).cancelOrder(ctx.input.orderId);
    return {
      output: { orderId: ctx.input.orderId, result },
      message: `Canceled order \`${ctx.input.orderId}\`.`
    };
  })
  .build();
