import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStatistics = SlateTool.create(spec, {
  name: 'Get Statistics',
  key: 'get_statistics',
  description: `Retrieve aggregate sending statistics from your Postmark server. Get an overview of sent counts, bounces, spam complaints, open rates, and click rates. Filter by date range, tag, and message stream.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z.string().optional().describe('Filter stats by tag.'),
      fromDate: z.string().optional().describe('Start date (YYYY-MM-DD).'),
      toDate: z.string().optional().describe('End date (YYYY-MM-DD).'),
      messageStream: z.string().optional().describe('Filter by message stream ID.')
    })
  )
  .output(
    z.object({
      sent: z.number().describe('Total emails sent.'),
      bounced: z.number().describe('Total bounced emails.'),
      bounceRate: z.number().describe('Bounce rate percentage.'),
      spamComplaints: z.number().describe('Total spam complaints.'),
      spamComplaintsRate: z.number().describe('Spam complaint rate percentage.'),
      opens: z.number().describe('Total opens.'),
      uniqueOpens: z.number().describe('Unique opens.'),
      totalClicks: z.number().describe('Total link clicks.'),
      uniqueLinksClicked: z.number().describe('Unique links clicked.'),
      withOpenTracking: z.number().describe('Messages sent with open tracking enabled.'),
      withLinkTracking: z.number().describe('Messages sent with link tracking enabled.'),
      smtpApiErrors: z.number().describe('Total SMTP API errors.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    let stats = await client.getOutboundOverview({
      tag: ctx.input.tag,
      fromdate: ctx.input.fromDate,
      todate: ctx.input.toDate,
      messageStream: ctx.input.messageStream
    });

    return {
      output: {
        sent: stats.Sent,
        bounced: stats.Bounced,
        bounceRate: stats.BounceRate,
        spamComplaints: stats.SpamComplaints,
        spamComplaintsRate: stats.SpamComplaintsRate,
        opens: stats.Opens,
        uniqueOpens: stats.UniqueOpens,
        totalClicks: stats.TotalClicks,
        uniqueLinksClicked: stats.UniqueLinksClicked,
        withOpenTracking: stats.WithOpenTracking,
        withLinkTracking: stats.WithLinkTracking,
        smtpApiErrors: stats.SMTPApiErrors
      },
      message: `**${stats.Sent}** sent, **${stats.Bounced}** bounced (${stats.BounceRate}%), **${stats.UniqueOpens}** unique opens, **${stats.UniqueLinksClicked}** unique clicks.`
    };
  });
