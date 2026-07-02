import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStats = SlateTool.create(spec, {
  name: 'Get Campaign Statistics',
  key: 'get_campaign_stats',
  description: `Retrieve detailed performance statistics for a campaign within a date range. Includes metrics on leads reached, opens, clicks, replies, bounces, meetings booked, and more.`,
  constraints: ['Both startDate and endDate are required in ISO 8601 format.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign'),
      startDate: z
        .string()
        .describe('Start date in ISO 8601 format (e.g., 2024-01-01T00:00:00.000Z)'),
      endDate: z
        .string()
        .describe('End date in ISO 8601 format (e.g., 2024-12-31T23:59:59.999Z)'),
      channels: z
        .array(z.enum(['email', 'linkedin', 'others']))
        .optional()
        .describe('Filter stats by channels')
    })
  )
  .output(
    z.object({
      leadsTotal: z.number().optional(),
      leadsLaunched: z.number().optional(),
      leadsReached: z.number().optional(),
      leadsOpened: z.number().optional(),
      leadsClicked: z.number().optional(),
      leadsReplied: z.number().optional(),
      leadsInterested: z.number().optional(),
      leadsNotInterested: z.number().optional(),
      leadsUnsubscribed: z.number().optional(),
      messagesSent: z.number().optional(),
      messagesNotSent: z.number().optional(),
      messagesBounced: z.number().optional(),
      delivered: z.number().optional(),
      opened: z.number().optional(),
      clicked: z.number().optional(),
      replied: z.number().optional(),
      meetingBooked: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let stats = await client.getCampaignStats(ctx.input.campaignId, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      channels: ctx.input.channels
    });

    let output = {
      leadsTotal: stats.nbLeads,
      leadsLaunched: stats.nbLeadsLaunched,
      leadsReached: stats.nbLeadsReached,
      leadsOpened: stats.nbLeadsOpened,
      leadsClicked: stats.nbLeadsInteracted,
      leadsReplied: stats.nbLeadsAnswered,
      leadsInterested: stats.nbLeadsInterested,
      leadsNotInterested: stats.nbLeadsNotInterested,
      leadsUnsubscribed: stats.nbLeadsUnsubscribed,
      messagesSent: stats.messagesSent,
      messagesNotSent: stats.messagesNotSent,
      messagesBounced: stats.messagesBounced,
      delivered: stats.delivered,
      opened: stats.opened,
      clicked: stats.clicked,
      replied: stats.replied,
      meetingBooked: stats.meetingBooked
    };

    return {
      output,
      message: `Campaign stats: **${output.messagesSent ?? 0}** sent, **${output.opened ?? 0}** opened, **${output.clicked ?? 0}** clicked, **${output.replied ?? 0}** replied.`
    };
  })
  .build();
