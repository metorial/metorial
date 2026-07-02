import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCustomerTool = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer from your Landbot account. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('Numeric ID of the customer to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the customer was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);
    await client.deleteCustomer(ctx.input.customerId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted customer **#${ctx.input.customerId}**.`
    };
  });
