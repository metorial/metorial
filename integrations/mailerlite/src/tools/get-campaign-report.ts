import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignReport = SlateTool.create(spec, {
  name: 'Get Campaign Report',
  key: 'get_campaign_report',
  description: `Retrieves campaign details and subscriber activity reports for a sent campaign. Returns engagement data including opens, clicks, unsubscribes, and bounces.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      activityType: z
        .enum([
          'opened',
          'unopened',
          'clicked',
          'unsubscribed',
          'forwarded',
          'hardbounced',
          'softbounced',
          'junk'
        ])
        .optional()
        .describe('Filter subscriber activity by type'),
      search: z.string().optional().describe('Filter subscriber activity by subscriber email'),
      limit: z.number().optional().describe('Number of activity records per page'),
      page: z.number().optional().describe('Page number'),
      sort: z
        .enum(['id', 'updated_at', 'clicks_count', 'opens_count'])
        .optional()
        .describe('Sort subscriber activity by MailerLite-supported field'),
      includeSubscriberGroups: z
        .boolean()
        .optional()
        .describe('Include subscriber.groups in campaign activity records')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().optional().describe('Campaign name'),
      type: z.string().optional().describe('Campaign type'),
      status: z.string().optional().describe('Campaign status'),
      sentAt: z.string().optional().nullable().describe('When the campaign was sent'),
      stats: z.any().optional().describe('Campaign statistics (open rate, click rate, etc.)'),
      activities: z
        .array(
          z.object({
            subscriberEmail: z.string().optional().describe('Subscriber email'),
            type: z.string().optional().describe('Activity type'),
            timestamp: z.string().optional().describe('Activity timestamp')
          })
        )
        .optional()
        .describe('Subscriber activity records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let campaignResult = await client.getCampaign(ctx.input.campaignId);
    let campaign = campaignResult.data;

    let activities: any[] = [];
    if (campaign.status === 'sent') {
      let activityResult = await client.getCampaignSubscriberActivity(ctx.input.campaignId, {
        type: ctx.input.activityType,
        search: ctx.input.search,
        limit: ctx.input.limit,
        page: ctx.input.page,
        sort: ctx.input.sort,
        include: ctx.input.includeSubscriberGroups ? 'subscriber.groups' : 'subscriber'
      });
      activities = (activityResult.data || []).map((a: any) => ({
        subscriberEmail: a.subscriber?.email || a.email,
        type: a.type,
        timestamp: a.created_at || a.timestamp
      }));
    }

    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        sentAt: campaign.sent_at,
        stats: campaign.stats,
        activities: activities.length > 0 ? activities : undefined
      },
      message: `Campaign **${campaign.name}** (${campaign.status})${activities.length > 0 ? ` — retrieved **${activities.length}** activity records` : ''}.`
    };
  })
  .build();
