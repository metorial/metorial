import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setCustomerChasing = SlateTool.create(spec, {
  name: 'Pause or Resume Customer Chasing',
  key: 'set_customer_chasing',
  description:
    'Pause or resume payment reminders for a customer. Pausing stops chasing all invoices for that customer until customer chasing is resumed.',
  instructions: [
    'Use list_customers or get_customer to discover the customer. Use its internal ID or prefix its external ID with "ext_".'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      customerId: z.string().describe('Internal customer ID or "ext_{externalId}"'),
      action: z.enum(['pause', 'resume']).describe('Pause or resume customer chasing')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Internal Chaser customer ID'),
      chasing: z.boolean().describe('Whether chasing is enabled for the customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.setCustomerChasing(ctx.input.customerId, ctx.input.action);
    return {
      output: { customerId: result.id, chasing: result.chasing },
      message: `Customer chasing is ${result.chasing ? 'enabled' : 'paused'} for ${result.id}.`
    };
  })
  .build();
