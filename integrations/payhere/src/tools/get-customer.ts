import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Fetch detailed information about a specific customer by their ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to retrieve')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Customer identifier'),
      name: z.string().describe('Customer name'),
      email: z.string().describe('Customer email'),
      ipAddress: z.string().nullable().describe('IP address at time of payment'),
      location: z.string().nullable().describe('Geographic location'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let customer = await client.getCustomer(ctx.input.customerId);

    return {
      output: customer,
      message: `Customer **${customer.name}** (${customer.email})${customer.location ? `, located in ${customer.location}` : ''}.`
    };
  })
  .build();
