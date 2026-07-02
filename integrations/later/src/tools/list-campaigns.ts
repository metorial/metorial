import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaignsTool = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve campaigns associated with your Later Influence community. Optionally filter by a specific campaign ID to get details on a single campaign. Returns campaign details including status, dates, title, and description.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('Filter by a specific campaign ID to retrieve only that campaign')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z
            .object({
              campaignId: z.string().describe('Unique identifier of the campaign'),
              title: z.string().describe('Title of the campaign'),
              status: z.string().describe('Current status of the campaign'),
              startDate: z.string().describe('Start date of the campaign'),
              endDate: z.string().describe('End date of the campaign'),
              description: z.string().describe('Description of the campaign')
            })
            .passthrough()
        )
        .describe('List of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let campaigns = await client.getCampaigns({
      campaignId: ctx.input.campaignId
    });

    let campaignList = Array.isArray(campaigns) ? campaigns : [campaigns];

    return {
      output: {
        campaigns: campaignList as any
      },
      message: ctx.input.campaignId
        ? `Retrieved campaign **${ctx.input.campaignId}**.`
        : `Retrieved **${campaignList.length}** campaign(s).`
    };
  })
  .build();
