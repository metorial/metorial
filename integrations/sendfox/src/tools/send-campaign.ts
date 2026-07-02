import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCampaign = SlateTool.create(spec, {
  name: 'Send Campaign',
  key: 'send_campaign',
  description: `Send a draft campaign immediately. The campaign must have at least one list assigned and must not already be sent or scheduled.`,
  constraints: [
    'The campaign must be in draft state (not already sent or scheduled).',
    'At least one list must be assigned to the campaign.',
    'Abuse prevention applies: content approval, sending throttles, spam detection, and bounce rate monitoring.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the draft campaign to send')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      title: z.string().describe('Campaign title'),
      subject: z.string().describe('Email subject line')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let campaign = await client.sendCampaign(ctx.input.campaignId);

    return {
      output: {
        campaignId: campaign.id,
        title: campaign.title,
        subject: campaign.subject
      },
      message: `Campaign **${campaign.title}** (ID: ${campaign.id}) has been queued for immediate sending.`
    };
  })
  .build();
