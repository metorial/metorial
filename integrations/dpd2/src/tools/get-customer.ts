import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve detailed information about a specific DPD customer by their ID, including name, email, and newsletter subscription status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('The unique ID of the customer to retrieve')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let customer = await client.getCustomer(ctx.input.customerId);

    return {
      output: customer,
      message: `Retrieved customer #${customer.customerId}.`
    };
  })
  .build();
