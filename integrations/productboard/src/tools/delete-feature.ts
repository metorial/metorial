import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFeatureTool = SlateTool.create(spec, {
  name: 'Delete Feature',
  key: 'delete_feature',
  description: `Permanently delete a feature from the product hierarchy. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      featureId: z.string().describe('The ID of the feature to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteFeature(ctx.input.featureId);

    return {
      output: { success: true },
      message: `Deleted feature **${ctx.input.featureId}**.`
    };
  })
  .build();
