import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalNumber } from '../lib/client';
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
      leadsClicked: z
        .number()
        .optional()
        .describe(
          'Legacy field for the provider nbLeadsInteracted metric, which includes clicks and replies; it is not a click-only counter.'
        ),
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
    const stats = await new Client({ token: ctx.auth.token }).getCampaignStats(
      ctx.input.campaignId,
      ctx.input
    );
    const output = {
      leadsTotal: optionalNumber(stats.nbLeads),
      leadsLaunched: optionalNumber(stats.nbLeadsLaunched),
      leadsReached: optionalNumber(stats.nbLeadsReached),
      leadsOpened: optionalNumber(stats.nbLeadsOpened),
      leadsClicked: optionalNumber(stats.nbLeadsInteracted),
      leadsReplied: optionalNumber(stats.nbLeadsAnswered),
      leadsInterested: optionalNumber(stats.nbLeadsInterested),
      leadsNotInterested: optionalNumber(stats.nbLeadsNotInterested),
      leadsUnsubscribed: optionalNumber(stats.nbLeadsUnsubscribed),
      messagesSent: optionalNumber(stats.messagesSent),
      messagesNotSent: optionalNumber(stats.messagesNotSent),
      messagesBounced: optionalNumber(stats.messagesBounced),
      delivered: optionalNumber(stats.delivered),
      opened: optionalNumber(stats.opened),
      clicked: optionalNumber(stats.clicked),
      replied: optionalNumber(stats.replied),
      meetingBooked: optionalNumber(stats.meetingBooked)
    };
    return {
      output,
      message:
        'Retrieved the available campaign metrics for the requested date range. Omitted counters remain unknown.'
    };
  })
  .build();
