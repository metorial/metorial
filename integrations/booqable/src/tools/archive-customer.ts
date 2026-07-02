import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig } from '../lib/helpers';
import { spec } from '../spec';

export let archiveCustomer = SlateTool.create(spec, {
  name: 'Archive Customer',
  key: 'archive_customer',
  description: `Archive a customer in Booqable. Archived customers are soft-deleted and can be filtered out from listings.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The unique ID of the customer to archive')
    })
  )
  .output(
    z.object({
      archived: z.boolean().describe('Whether the customer was successfully archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));
    await client.archiveCustomer(ctx.input.customerId);

    return {
      output: { archived: true },
      message: `Archived customer ${ctx.input.customerId}.`
    };
  })
  .build();
