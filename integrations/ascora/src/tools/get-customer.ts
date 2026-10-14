import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description:
    'Retrieve one Ascora customer, including contact details, addresses, customer type and custom fields. Use list_customers to discover the customer ID.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().min(1).describe('Customer ID returned by list_customers')
    })
  )
  .output(z.object({ customer: z.any().describe('Complete customer record from Ascora') }))
  .handleInvocation(async ctx => {
    let customer = await new AscoraClient(ctx.auth).getCustomer(ctx.input.customerId);
    return {
      output: { customer },
      message: `Retrieved customer **${ctx.input.customerId}** from Ascora.`
    };
  })
  .build();
