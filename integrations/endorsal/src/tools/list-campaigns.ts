import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve AutoRequest campaigns from your Endorsal account. AutoRequests are automated testimonial generation campaigns that send customers review requests via email and SMS. Returns campaign details including delivery stats and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('Fetch a specific campaign by ID. If omitted, returns all campaigns.'),
      limit: z.number().optional().describe('Maximum number of campaigns to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.string().describe('Unique campaign ID'),
          name: z.string().optional().describe('Campaign name'),
          enabled: z.boolean().optional().describe('Whether the campaign is active'),
          stats: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Campaign delivery stats (open rates, click rates, new reviews)'),
          rules: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Campaign targeting rules and custom attribute filters'),
          created: z.number().optional().describe('Timestamp when campaign was created'),
          updated: z.number().optional().describe('Timestamp when campaign was last updated')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.campaignId) {
      let campaign = await client.getCampaign(ctx.input.campaignId);
      return {
        output: {
          campaigns: [
            {
              campaignId: campaign._id,
              name: campaign.name,
              enabled: campaign.enabled,
              stats: campaign.stats,
              rules: campaign.rules,
              created: campaign.created,
              updated: campaign.updated
            }
          ]
        },
        message: `Retrieved campaign **${campaign.name || campaign._id}**${campaign.enabled ? ' (active)' : ' (inactive)'}.`
      };
    }

    let result = await client.listCampaigns({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let campaigns = (result.data || []).map(c => ({
      campaignId: c._id,
      name: c.name,
      enabled: c.enabled,
      stats: c.stats,
      rules: c.rules,
      created: c.created,
      updated: c.updated
    }));

    return {
      output: { campaigns },
      message: `Found **${campaigns.length}** campaign(s).`
    };
  })
  .build();
