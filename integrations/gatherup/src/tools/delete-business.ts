import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteBusiness = SlateTool.create(spec, {
  name: 'Delete Business',
  key: 'delete_business',
  description: `Permanently delete a business location from GatherUp. Use action "deactivate" to pause the business and preserve its data. Also supports deactivating and reactivating a business.`,
  instructions: [
    'Deletion is permanent. Consider deactivating instead if you may need the business later.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      businessId: z.number().describe('ID of the business'),
      action: z
        .enum(['delete', 'deactivate', 'reactivate'])
        .describe('Action to perform: delete (permanent), deactivate (pause), or reactivate')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      await client.deleteBusiness(ctx.input.businessId);
    } else if (ctx.input.action === 'deactivate') {
      await client.deactivateBusiness(ctx.input.businessId);
    } else {
      await client.reactivateBusiness(ctx.input.businessId);
    }

    return {
      output: { success: true },
      message: `Business **${ctx.input.businessId}** has been **${ctx.input.action === 'delete' ? 'deleted' : ctx.input.action === 'deactivate' ? 'deactivated' : 'reactivated'}** successfully.`
    };
  })
  .build();
