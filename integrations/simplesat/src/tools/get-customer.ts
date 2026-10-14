import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description:
    'Get a customer by their Simplesat ID, including contact details, tags, and custom attributes. Call list_customers to discover customer IDs. Requires an API key with read customers access.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z
        .number()
        .describe('Customer ID. Call list_customers to discover customer IDs.')
    })
  )
  .output(
    z.object({
      customer: z
        .record(z.string(), z.unknown())
        .describe('The customer record, including its id')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let customer = await client.getCustomer(ctx.input.customerId);
    return {
      output: { customer },
      message: `Retrieved customer #${ctx.input.customerId}.`
    };
  })
  .build();
