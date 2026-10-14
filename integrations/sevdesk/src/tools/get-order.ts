import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description:
    'Retrieve an order by ID with contact, delivery, tax, status, and amount details before converting it to an invoice.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orderId: z.string().min(1).describe('Order ID. Use search_orders to find orders.')
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      order: z
        .any()
        .describe(
          'Order details, including contact, status, dates, amounts, and tax information.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });
    let order = await client.getOrder(ctx.input.orderId, { embed: 'contact' });
    if (order?.id == null) {
      throw createApiServiceError('sevDesk did not return the requested order.');
    }
    return {
      output: { orderId: String(order.id), order },
      message: `Retrieved order **${order.orderNumber ?? order.id}**.`
    };
  })
  .build();
