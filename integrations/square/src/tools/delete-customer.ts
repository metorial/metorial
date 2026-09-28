import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer profile from the Square account. This action cannot be undone.`,
  tags: { destructive: true }
})
  .scopes(allOf('CUSTOMERS_WRITE'))
  .input(
    z.object({
      customerId: z.string().describe('The ID of the customer to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      customerId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['CUSTOMERS_WRITE']);
    let client = createClient(ctx.auth);
    await client.deleteCustomer(ctx.input.customerId);

    return {
      output: { success: true, customerId: ctx.input.customerId },
      message: `Customer **${ctx.input.customerId}** deleted.`
    };
  })
  .build();
