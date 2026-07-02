import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let cancelCampaign = SlateTool.create(spec, {
  name: 'Cancel Campaign',
  key: 'cancel_campaign',
  description: `Cancel a scheduled or pending campaign. Only campaigns that have not yet started sending can be cancelled.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to cancel')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    await client.cancelCampaign(ctx.input.campaignId);

    return {
      output: { success: true },
      message: `Cancelled campaign \`${ctx.input.campaignId}\``
    };
  })
  .build();
