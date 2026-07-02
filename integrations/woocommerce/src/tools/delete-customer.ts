import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Delete a customer account from WooCommerce. Use force to permanently delete the customer record.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('The customer ID to delete'),
      force: z
        .boolean()
        .optional()
        .default(true)
        .describe('True to permanently delete the customer')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      email: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.deleteCustomer(ctx.input.customerId, ctx.input.force);
    let previous = result.previous ?? result;

    return {
      output: {
        customerId: previous.id ?? ctx.input.customerId,
        email: previous.email || '',
        deleted: true
      },
      message: `Deleted customer (ID: ${ctx.input.customerId}).`
    };
  })
  .build();
