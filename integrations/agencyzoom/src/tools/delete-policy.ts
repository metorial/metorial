import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePolicy = SlateTool.create(spec, {
  name: 'Delete Policy',
  key: 'delete_policy',
  description: `Delete an insurance policy from AgencyZoom. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      policyId: z.string().describe('ID of the policy to delete'),
      customerId: z
        .string()
        .optional()
        .describe(
          'Customer ID for the documented customer-policy deletion route. Discover it with search_customers or get_customer.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the policy was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    await client.deletePolicy(ctx.input.policyId, ctx.input.customerId);

    return {
      output: { success: true },
      message: `Deleted policy **${ctx.input.policyId}**.`
    };
  })
  .build();
