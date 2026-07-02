import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeCustomers = SlateTool.create(spec, {
  name: 'Unsubscribe Customers',
  key: 'unsubscribe_customers',
  description: `Unsubscribe one or more customers from receiving future surveys. Optionally include a custom opt-out message explaining the reason for unsubscription.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      emails: z
        .array(z.string())
        .min(1)
        .describe('Email addresses of customers to unsubscribe'),
      message: z.string().optional().describe('Custom opt-out message/reason')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the unsubscription succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.unsubscribeCustomers(ctx.input.emails, ctx.input.message);

    return {
      output: { success: true },
      message: `Unsubscribed **${ctx.input.emails.length}** customer(s) from future surveys.`
    };
  })
  .build();
