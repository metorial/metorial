import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer record from AgencyZoom. This action is irreversible and will remove the customer and all associated data. Use with caution.`,
  constraints: [
    'This action is irreversible. The customer and all associated data will be permanently deleted.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Unique identifier of the customer to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the customer was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    await client.deleteCustomer(ctx.input.customerId);

    return {
      output: { success: true },
      message: `Successfully deleted customer **${ctx.input.customerId}**.`
    };
  })
  .build();
