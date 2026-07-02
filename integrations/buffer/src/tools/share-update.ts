import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let shareUpdateTool = SlateTool.create(spec, {
  name: 'Share Update Now',
  key: 'share_update',
  description: `Immediately share a pending update that is currently in the queue. The update is published right away and remaining queue times are recalculated.`,
  constraints: [
    'Only pending (queued) updates can be shared. Already-sent updates will return an error.'
  ]
})
  .input(
    z.object({
      updateId: z.string().describe('ID of the pending update to share immediately')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was shared successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.shareUpdate(ctx.input.updateId);

    return {
      output: {
        success: result.success
      },
      message: `Successfully shared update **${ctx.input.updateId}** immediately.`
    };
  })
  .build();
