import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokBusinessClient } from '../lib/client';
import { spec } from '../spec';

export let getAds = SlateTool.create(spec, {
  name: 'Get Ads',
  key: 'get_ads',
  description: `Retrieve TikTok ads for an advertiser. Filter by campaign IDs, ad group IDs, or specific ad IDs. Returns ad details including name, status, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      advertiserId: z.string().describe('TikTok Ads advertiser/account ID.'),
      campaignIds: z.array(z.string()).optional().describe('Filter by parent campaign IDs.'),
      adGroupIds: z.array(z.string()).optional().describe('Filter by parent ad group IDs.'),
      adIds: z.array(z.string()).optional().describe('Filter by specific ad IDs.'),
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
      ads: z
        .array(
          z.object({
            adId: z.string().describe('Ad ID.'),
            adGroupId: z.string().describe('Parent ad group ID.'),
            campaignId: z.string().describe('Parent campaign ID.'),
            adName: z.string().describe('Ad name.'),
            operationStatus: z.string().describe('Current status.'),
            createTime: z.string().describe('Creation timestamp.'),
            modifyTime: z.string().describe('Last modification timestamp.')
          })
        )
        .describe('List of ads.'),
      totalCount: z.number().describe('Total number of matching ads.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokBusinessClient({ token: ctx.auth.token });

    let result = await client.getAds({
      advertiserId: ctx.input.advertiserId,
      campaignIds: ctx.input.campaignIds,
      adGroupIds: ctx.input.adGroupIds,
      adIds: ctx.input.adIds,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        ads: result.ads,
        totalCount: result.pageInfo.totalNumber
      },
      message: `Retrieved **${result.ads.length}** ad(s) (${result.pageInfo.totalNumber} total).`
    };
  })
  .build();
