import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description:
    'Retrieve an order and its processing status, addresses, pricing, and delivery information. Use an order ID returned by send_card or manage_basket.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({ orderId: z.string().describe('Order ID returned when the order was created') })
  )
  .output(
    z.object({
      order: z
        .record(z.string(), z.unknown())
        .describe('Complete order details returned by Handwrytten')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getOrder(ctx.input.orderId);
    if (!isApiErrorRecord(result.order)) {
      throw createApiServiceError('Handwrytten did not return order details.');
    }
    return {
      output: { order: result.order },
      message: `Retrieved order \`${ctx.input.orderId}\`.`
    };
  })
  .build();
