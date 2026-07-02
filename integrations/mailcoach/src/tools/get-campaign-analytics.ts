import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignAnalytics = SlateTool.create(spec, {
  name: 'Get Campaign Analytics',
  key: 'get_campaign_analytics',
  description: `Retrieve engagement analytics for a sent campaign — opens, clicks, unsubscribes, and bounces. Select one or more metric types to retrieve.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignUuid: z.string().describe('UUID of the campaign'),
      metric: z
        .enum(['opens', 'clicks', 'unsubscribes', 'bounces'])
        .describe('The type of analytics to retrieve'),
      bounceType: z
        .enum(['bounce', 'soft_bounce', 'complaint'])
        .optional()
        .describe('Filter bounces by type (only applicable when metric is "bounces")'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.unknown())).describe('Analytics records'),
      totalCount: z.number().describe('Total number of records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result: any;

    switch (ctx.input.metric) {
      case 'opens':
        result = await client.getCampaignOpens(ctx.input.campaignUuid, {
          page: ctx.input.page
        });
        break;
      case 'clicks':
        result = await client.getCampaignClicks(ctx.input.campaignUuid, {
          page: ctx.input.page
        });
        break;
      case 'unsubscribes':
        result = await client.getCampaignUnsubscribes(ctx.input.campaignUuid, {
          page: ctx.input.page
        });
        break;
      case 'bounces':
        result = await client.getCampaignBounces(ctx.input.campaignUuid, {
          type: ctx.input.bounceType,
          page: ctx.input.page
        });
        break;
    }

    let records = result.data || [];

    return {
      output: {
        records,
        totalCount: result.meta?.total ?? records.length
      },
      message: `Retrieved **${records.length}** ${ctx.input.metric} record(s) for campaign **${ctx.input.campaignUuid}**.`
    };
  });
