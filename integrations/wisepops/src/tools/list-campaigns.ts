import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve all Wisepops campaigns with their display and conversion metrics.
Returns each campaign's name, activation status, creation date, display count, click count, and email collection count.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.number().describe('Unique identifier of the campaign.'),
            label: z.string().describe('Name/label of the campaign.'),
            createdAt: z
              .string()
              .describe('ISO 8601 timestamp when the campaign was created.'),
            activated: z.boolean().describe('Whether the campaign is currently active.'),
            displayCount: z
              .number()
              .describe('Total number of times the campaign was displayed.'),
            clickCount: z.number().describe('Total number of clicks on the campaign.'),
            emailCount: z
              .number()
              .describe('Total number of emails collected by the campaign.')
          })
        )
        .describe('List of campaigns with metrics.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let campaigns = await client.listCampaigns();

    let mappedCampaigns = campaigns.map(c => ({
      campaignId: c.id,
      label: c.label,
      createdAt: c.created_at,
      activated: c.activated,
      displayCount: c.display_count,
      clickCount: c.click_count,
      emailCount: c.email_count
    }));

    return {
      output: { campaigns: mappedCampaigns },
      message: `Retrieved **${mappedCampaigns.length}** campaign(s).`
    };
  })
  .build();
