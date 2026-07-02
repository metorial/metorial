import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokBusinessClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaigns = SlateTool.create(spec, {
  name: 'Get Campaigns',
  key: 'get_campaigns',
  description: `Retrieve TikTok Ads campaigns for an advertiser. Optionally filter by specific campaign IDs. Returns campaign details including name, objective, budget, status, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      advertiserId: z.string().describe('TikTok Ads advertiser/account ID.'),
      campaignIds: z.array(z.string()).optional().describe('Filter by specific campaign IDs.'),
      page: z.number().optional().describe('Page number (default 1).'),
      pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Results per page (default 20, max 1000).')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID.'),
            campaignName: z.string().describe('Campaign name.'),
            objectiveType: z.string().describe('Advertising objective type.'),
            budget: z.number().describe('Campaign budget.'),
            budgetMode: z.string().describe('Budget mode.'),
            operationStatus: z.string().describe('Current campaign status.'),
            campaignType: z.string().describe('Campaign type.'),
            createTime: z.string().describe('Creation timestamp.'),
            modifyTime: z.string().describe('Last modification timestamp.')
          })
        )
        .describe('List of campaigns.'),
      totalCount: z.number().describe('Total number of matching campaigns.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokBusinessClient({ token: ctx.auth.token });

    let result = await client.getCampaigns({
      advertiserId: ctx.input.advertiserId,
      campaignIds: ctx.input.campaignIds,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        campaigns: result.campaigns,
        totalCount: result.pageInfo.totalNumber
      },
      message: `Retrieved **${result.campaigns.length}** campaign(s) (${result.pageInfo.totalNumber} total).`
    };
  })
  .build();
