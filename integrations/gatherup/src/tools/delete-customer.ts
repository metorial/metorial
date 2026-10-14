import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer record from GatherUp.`,
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
      success: z.boolean().describe('Whether the deletion was successful'),
      businessId: z
        .number()
        .optional()
        .describe('Business ID the customer was associated with')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.deleteCustomer(ctx.input.customerId);

    return {
      output: {
        success: true,
        businessId: data.businessId
      },
      message: `Customer **${ctx.input.customerId}** deleted successfully.`
    };
  })
  .build();
