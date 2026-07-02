import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer from Plain. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Plain customer ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the customer was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteCustomer(ctx.input.customerId);

    return {
      output: {
        deleted: true
      },
      message: `Customer **${ctx.input.customerId}** deleted`
    };
  })
  .build();
