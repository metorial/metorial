import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokBusinessClient } from '../lib/client';
import { spec } from '../spec';

export let getAdGroups = SlateTool.create(spec, {
  name: 'Get Ad Groups',
  key: 'get_ad_groups',
  description: `Retrieve TikTok Ads ad groups for an advertiser. Filter by campaign IDs or specific ad group IDs. Returns ad group details including targeting, budget, schedule, and optimization settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      advertiserId: z.string().describe('TikTok Ads advertiser/account ID.'),
      campaignIds: z.array(z.string()).optional().describe('Filter by parent campaign IDs.'),
      adGroupIds: z.array(z.string()).optional().describe('Filter by specific ad group IDs.'),
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
      adGroups: z
        .array(
          z.object({
            adGroupId: z.string().describe('Ad group ID.'),
            adGroupName: z.string().describe('Ad group name.'),
            campaignId: z.string().describe('Parent campaign ID.'),
            operationStatus: z.string().describe('Current status.'),
            budget: z.number().describe('Ad group budget.'),
            budgetMode: z.string().describe('Budget mode.'),
            optimizeGoal: z.string().describe('Optimization goal.'),
            billingEvent: z.string().describe('Billing event type.'),
            scheduleStartTime: z.string().describe('Schedule start time.'),
            scheduleEndTime: z.string().describe('Schedule end time.')
          })
        )
        .describe('List of ad groups.'),
      totalCount: z.number().describe('Total number of matching ad groups.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokBusinessClient({ token: ctx.auth.token });

    let result = await client.getAdGroups({
      advertiserId: ctx.input.advertiserId,
      campaignIds: ctx.input.campaignIds,
      adGroupIds: ctx.input.adGroupIds,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        adGroups: result.adGroups,
        totalCount: result.pageInfo.totalNumber
      },
      message: `Retrieved **${result.adGroups.length}** ad group(s) (${result.pageInfo.totalNumber} total).`
    };
  })
  .build();
