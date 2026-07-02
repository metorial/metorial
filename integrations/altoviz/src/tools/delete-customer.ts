import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Delete a customer from Altoviz by their Altoviz ID or your own internal ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Altoviz customer ID'),
      internalId: z
        .string()
        .optional()
        .describe('Your custom internal ID (used if customerId is not provided)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let resolvedId = ctx.input.customerId;
    if (!resolvedId && ctx.input.internalId) {
      let customer = await client.getCustomerByInternalId(ctx.input.internalId);
      resolvedId = customer.id;
    }
    if (!resolvedId) {
      throw new Error('Either customerId or internalId must be provided');
    }

    await client.deleteCustomer(resolvedId);

    return {
      output: { deleted: true },
      message: `Deleted customer with ID **${resolvedId}**.`
    };
  })
  .build();
