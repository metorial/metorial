import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStatistics = SlateTool.create(spec, {
  name: 'Get Campaign Statistics',
  key: 'get_campaign_statistics',
  description: `Retrieves engagement statistics for a specific campaign, including opens and clicks with subscriber-level detail. Choose which metric to retrieve. Returns paginated results with email addresses and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to get statistics for'),
      metric: z.enum(['opens', 'clicks']).describe('Which metric to retrieve'),
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            email: z.string().describe('Subscriber email address'),
            timestamp: z.string().describe('When the event occurred'),
            url: z.string().optional().describe('Clicked URL (only for clicks metric)')
          })
        )
        .describe('Engagement events'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Total number of pages'),
      total: z.number().describe('Total number of events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.metric === 'clicks') {
      let result = await client.getCampaignClicks(ctx.input.campaignId, ctx.input.page);

      return {
        output: {
          events: result.data.map(e => ({
            email: e.email,
            timestamp: e.created_at,
            url: e.url
          })),
          currentPage: result.meta.current_page,
          lastPage: result.meta.last_page,
          total: result.meta.total
        },
        message: `Campaign \`${ctx.input.campaignId}\` has **${result.meta.total}** click event(s) (page ${result.meta.current_page}/${result.meta.last_page}).`
      };
    }

    let result = await client.getCampaignOpens(ctx.input.campaignId, ctx.input.page);

    return {
      output: {
        events: result.data.map(e => ({
          email: e.email,
          timestamp: e.created_at
        })),
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total
      },
      message: `Campaign \`${ctx.input.campaignId}\` has **${result.meta.total}** open event(s) (page ${result.meta.current_page}/${result.meta.last_page}).`
    };
  })
  .build();
