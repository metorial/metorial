import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listCustomers = SlateTool.create(spec, {
  key: 'list_customers',
  name: 'List Customers',
  description:
    'Discover the Sprout customer accounts authorized by this connection. Pass a selected customerId to account-scoped operations.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ customers: z.array(z.object({ customerId: z.string(), name: z.string() })) })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listCustomers();
    return {
      output: {
        customers: result.data.map(
          (value: { customer_id: string | number; name: string }) => ({
            customerId: String(value.customer_id),
            name: value.name
          })
        )
      },
      message: 'Retrieved authorized Sprout customers.'
    };
  });
