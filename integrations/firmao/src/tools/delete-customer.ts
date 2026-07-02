import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Soft-delete a customer (counterparty) record in Firmao by marking it as deleted. The record can potentially be recovered.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to delete')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteResource('customers', ctx.input.customerId);

    return {
      output: {
        customerId: ctx.input.customerId,
        deleted: true
      },
      message: `Deleted customer ID **${ctx.input.customerId}**.`
    };
  })
  .build();
