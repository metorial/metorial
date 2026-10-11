import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerSchema, mapCustomer } from '../lib/customers';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve a single customer by ID, including contact details, visit history, total spent, and loyalty points balance.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().describe('The unique ID of the customer to retrieve')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let customer = await client.getCustomer(ctx.input.customerId);

    return {
      output: mapCustomer(customer),
      message: `Retrieved customer **${customer.name ?? customer.id}**.`
    };
  })
  .build();
