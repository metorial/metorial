import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieves all customers from Ascora. Returns customer records including contact details and company information.

Use this to look up existing customers, sync customer data to external systems, or verify customer records.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customers: z.array(z.any()).describe('List of customer records from Ascora'),
      count: z.number().describe('Total number of customers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AscoraClient({ token: ctx.auth.token });

    let customers = await client.listCustomers();

    return {
      output: {
        customers,
        count: customers.length
      },
      message: `Retrieved **${customers.length}** customer(s) from Ascora.`
    };
  })
  .build();
