import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCustomerTool = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve a specific customer/plan by ID. Returns full details including name, email, subscription status, payment source, discount info, custom fields, and a management URL.`,
  instructions: ['In MoonClerk, "Customers" in the API correspond to "Plans" in the web UI.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('MoonClerk customer ID')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let customer = await client.getCustomer(ctx.input.customerId);

    let statusInfo = customer.subscription ? ` (${customer.subscription.status})` : '';
    return {
      output: customer,
      message: `Retrieved customer **${customer.name}** (${customer.email})${statusInfo}.`
    };
  })
  .build();
