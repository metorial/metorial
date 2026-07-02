import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Delete a customer record by its ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteCustomer(ctx.input.customerId);

    return {
      output: { deleted: true },
      message: `Deleted customer \`${ctx.input.customerId}\`.`
    };
  })
  .build();
