import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let listOrderItems = SlateTool.create(spec, {
  name: 'List Order Items',
  key: 'list_order_items',
  description:
    'Read each recipient mail piece in an order, including delivery status/date, QR scan count, failure reason and recipient details. Gift card pieces also include redemption and invalidation timestamps.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      orderId: z.string().min(1).describe('Order ID from manage_orders or a send tool'),
      page: z.number().int().positive().optional(),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (default 50)')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.unknown())),
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response with pagination')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new ThanksIoClient({ token: ctx.auth.token }).listOrderItems(
      ctx.input.orderId,
      ctx.input
    );
    let items = (result.data || []) as Record<string, unknown>[];
    return {
      output: { items, raw: result },
      message: `Retrieved ${items.length} mail piece(s).`
    };
  })
  .build();
