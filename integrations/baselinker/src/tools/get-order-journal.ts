import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let getOrderJournal = SlateTool.create(spec, {
  name: 'Get Order Journal',
  key: 'get_order_journal',
  description:
    'Retrieve order events from the last three days, including order creation, payments, shipment changes and status changes. Enable the journal in account API settings first. Use the provider log_id cursor for subsequent requests.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      lastLogId: z
        .number()
        .optional()
        .describe('Log ID from which to retrieve subsequent events'),
      logsTypes: z
        .array(z.number())
        .optional()
        .describe(
          'Event type IDs, such as 1 for creation, 3 for payment or 18 for status change'
        ),
      orderId: z.number().optional().describe('Filter events for an order')
    })
  )
  .output(
    z.object({
      logs: z
        .any()
        .optional()
        .describe(
          'Provider event list, preserving log IDs, event types, order IDs, object IDs and timestamps'
        ),
      raw: z.any().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });
    let result = await client.getJournalList(ctx.input);
    return {
      output: { logs: result?.logs, raw: result },
      message: 'Retrieved the order journal.'
    };
  })
  .build();
