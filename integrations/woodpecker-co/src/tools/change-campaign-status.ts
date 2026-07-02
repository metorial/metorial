import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let changeCampaignStatus = SlateTool.create(spec, {
  name: 'Change Campaign Status',
  key: 'change_campaign_status',
  description: `Change the status of a campaign. Supports running, pausing, stopping, or making a campaign editable. Use this to control the lifecycle of campaigns.
- **run**: Start sending the campaign
- **pause**: Temporarily pause sending (can be resumed)
- **stop**: Fully stop the campaign
- **editable**: Set the campaign back to editable/draft mode for modifications`
})
  .input(
    z.object({
      campaignId: z.number().describe('The ID of the campaign'),
      action: z
        .enum(['run', 'pause', 'stop', 'editable'])
        .describe('The status action to perform')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      status: z.string().describe('New campaign status after the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let result = await client.changeCampaignStatus(ctx.input.campaignId, ctx.input.action);

    return {
      output: {
        campaignId: result?.id ?? result?.campaign_id ?? ctx.input.campaignId,
        status: result?.status ?? ctx.input.action.toUpperCase()
      },
      message: `Campaign ${ctx.input.campaignId} status changed to **${ctx.input.action}**.`
    };
  })
  .build();
