import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopLeadInCampaign = SlateTool.create(spec, {
  name: 'Stop Lead in Campaign',
  key: 'stop_lead_in_campaign',
  description: 'Stop further outreach to a specific lead in a HeyReach campaign.',
  instructions: ['Use get_lead to find the lead linkedin_id and profileUrl.']
})
  .input(
    z.object({
      campaignId: z.number().int().positive().describe('Campaign ID from list_campaigns'),
      leadMemberId: z
        .string()
        .min(1)
        .describe('Lead LinkedIn member ID, returned as linkedin_id by get_lead'),
      leadUrl: z.string().min(1).describe('LinkedIn profile URL of the lead to stop')
    })
  )
  .output(z.object({ campaignId: z.number(), leadMemberId: z.string(), stopped: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.stopLeadInCampaign(
      ctx.input.campaignId,
      ctx.input.leadMemberId,
      ctx.input.leadUrl
    );
    return {
      output: {
        campaignId: ctx.input.campaignId,
        leadMemberId: ctx.input.leadMemberId,
        stopped: true
      },
      message: `Stopped lead **${ctx.input.leadMemberId}** in campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
