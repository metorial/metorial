import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resubscribeCustomers = SlateTool.create(spec, {
  name: 'Resubscribe Customers',
  key: 'resubscribe_customers',
  description:
    'Resubscribe customers previously unsubscribed by the account owner. Self-unsubscribed and bounced contacts are skipped. Results identify each contact’s outcome; account, domain, or global suppression may still prevent delivery.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      emails: z.array(z.string()).min(1).describe('Customer email addresses to resubscribe')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe(
          'Provider response with per-customer statuses, skip reasons, and suppression flags'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).resubscribeCustomers(ctx.input.emails);
    return {
      output: { result },
      message:
        'Processed the resubscription request. Check per-customer results for skipped or missing contacts.'
    };
  })
  .build();
