import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List advertising campaigns for a given ad account. Supports filtering by campaign IDs and entity status. Can also list ad groups and ads within campaigns.`,
  instructions: [
    'Set "level" to "campaigns" to list campaigns for an ad account.',
    'Set "level" to "ad_groups" to list ad groups (optionally filtered by campaign).',
    'Set "level" to "ads" to list individual ads (optionally filtered by campaign or ad group).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adAccountId: z.string().describe('ID of the ad account'),
      level: z
        .enum(['campaigns', 'ad_groups', 'ads'])
        .describe('Level of advertising entities to list'),
      campaignIds: z.array(z.string()).optional().describe('Filter by specific campaign IDs'),
      adGroupIds: z
        .array(z.string())
        .optional()
        .describe('Filter by specific ad group IDs (for ads level)'),
      entityStatuses: z
        .array(z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']))
        .optional()
        .describe('Filter by entity status'),
      bookmark: z.string().optional().describe('Pagination bookmark from a previous response'),
      pageSize: z.number().optional().describe('Number of items to return')
    })
  )
  .output(
    z.object({
      items: z.array(z.any()).describe('List of campaigns, ad groups, or ads'),
      bookmark: z.string().optional().describe('Bookmark for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.level === 'campaigns') {
      result = await client.listCampaigns(ctx.input.adAccountId, {
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize,
        campaignIds: ctx.input.campaignIds,
        entityStatuses: ctx.input.entityStatuses
      });
    } else if (ctx.input.level === 'ad_groups') {
      result = await client.listAdGroups(ctx.input.adAccountId, {
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize,
        campaignIds: ctx.input.campaignIds,
        adGroupIds: ctx.input.adGroupIds,
        entityStatuses: ctx.input.entityStatuses
      });
    } else {
      result = await client.listAds(ctx.input.adAccountId, {
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize,
        campaignIds: ctx.input.campaignIds,
        adGroupIds: ctx.input.adGroupIds,
        entityStatuses: ctx.input.entityStatuses
      });
    }

    let items = result.items || [];

    return {
      output: {
        items,
        bookmark: result.bookmark ?? undefined
      },
      message: `Found **${items.length}** ${ctx.input.level.replace('_', ' ')}.${result.bookmark ? ' More results available with bookmark.' : ''}`
    };
  })
  .build();
