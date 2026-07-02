import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteBusiness = SlateTool.create(spec, {
  name: 'Delete Business',
  key: 'delete_business',
  description: `Permanently delete a business location from GatherUp. Use "Update Business" to deactivate instead if you want to preserve the data. Also supports deactivating and reactivating a business.`,
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
    let data: any;

    if (ctx.input.action === 'delete') {
      data = await client.deleteBusiness(ctx.input.businessId);
    } else if (ctx.input.action === 'deactivate') {
      data = await client.deactivateBusiness(ctx.input.businessId);
    } else {
      data = await client.reactivateBusiness(ctx.input.businessId);
    }

    if (data.errorCode !== 0) {
      throw new Error(
        `Failed to ${ctx.input.action} business: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    return {
      output: { success: true },
      message: `Business **${ctx.input.businessId}** has been **${ctx.input.action}d** successfully.`
    };
  })
  .build();
