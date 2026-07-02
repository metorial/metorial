import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let confirmOrder = SlateTool.create(spec, {
  name: 'Confirm Order',
  key: 'confirm_order',
  description: `Confirm and submit a draft order for processing. Use this for orders that were created with confirm set to false (incomplete/draft state). Once confirmed, the order will begin processing.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the draft order to confirm and submit.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the confirmed order.'),
      state: z.string().describe('Updated state of the order after confirmation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.confirmOrder(ctx.input.orderId);

    return {
      output: {
        orderId: result.id,
        state: result.state
      },
      message: `Order **${result.id}** has been confirmed and is now in state **${result.state}**.`
    };
  })
  .build();
