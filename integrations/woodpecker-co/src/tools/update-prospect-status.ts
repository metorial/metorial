import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProspectStatus = SlateTool.create(spec, {
  name: 'Update Prospect Interest',
  key: 'update_prospect_status',
  description: `Update a prospect's interest level within a campaign. Mark prospects as INTERESTED, NOT_INTERESTED, or MAYBE_LATER to organize your pipeline based on engagement quality.`
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID the prospect belongs to'),
      prospects: z
        .array(
          z.object({
            email: z.string().describe('Prospect email address'),
            interestLevel: z
              .enum(['INTERESTED', 'NOT_INTERESTED', 'MAYBE_LATER'])
              .describe('New interest level')
          })
        )
        .min(1)
        .describe('Prospects to update with their new interest levels')
    })
  )
  .output(
    z.object({
      updatedCount: z.number().describe('Number of prospects updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let mapped = ctx.input.prospects.map(p => ({
      email: p.email,
      interest: p.interestLevel
    }));

    await client.updateProspectInCampaign(ctx.input.campaignId, mapped);

    return {
      output: { updatedCount: ctx.input.prospects.length },
      message: `Updated interest level for **${ctx.input.prospects.length}** prospect(s) in campaign ${ctx.input.campaignId}.`
    };
  })
  .build();
