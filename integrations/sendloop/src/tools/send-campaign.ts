import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let sendCampaign = SlateTool.create(spec, {
  name: 'Send Campaign',
  key: 'send_campaign',
  description: `Send, pause, resume, or cancel a scheduled email campaign. Use this to control the delivery lifecycle of a prepared campaign.`,
  instructions: [
    'Make sure the campaign is fully configured before sending.',
    'Pausing only works on campaigns that are currently sending.',
    'Cancel schedule only works on campaigns that have been scheduled for future delivery.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      action: z
        .enum(['send', 'pause', 'resume', 'cancel_schedule'])
        .describe('The delivery action to perform')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { campaignId, action } = ctx.input;

    if (action === 'send') {
      await client.sendCampaign(campaignId);
      return {
        output: { success: true },
        message: `Campaign **${campaignId}** is now sending.`
      };
    }

    if (action === 'pause') {
      await client.pauseCampaign(campaignId);
      return {
        output: { success: true },
        message: `Campaign **${campaignId}** has been paused.`
      };
    }

    if (action === 'resume') {
      await client.resumeCampaign(campaignId);
      return {
        output: { success: true },
        message: `Campaign **${campaignId}** has been resumed.`
      };
    }

    if (action === 'cancel_schedule') {
      await client.cancelScheduledCampaign(campaignId);
      return {
        output: { success: true },
        message: `Scheduled campaign **${campaignId}** has been cancelled.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
