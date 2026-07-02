import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmailAnalytics = SlateTool.create(spec, {
  name: 'Get Email Analytics',
  key: 'get_email_analytics',
  description: `Retrieve performance analytics for a sent newsletter email. Returns recipient count, unique opens, unique clicks, engagement rate, comparison with the previous email, and per-link click tracking.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      newsletterEmailId: z
        .string()
        .describe('ID of the sent newsletter email to get analytics for')
    })
  )
  .output(
    z.object({
      newsletterEmailId: z.string().describe('ID of the newsletter email'),
      recipients: z.number().describe('Number of recipients'),
      uniqueOpens: z.number().describe('Number of unique opens'),
      uniqueClicks: z.number().describe('Number of unique clicks'),
      engagementRate: z.number().describe('Engagement rate percentage'),
      deltaPreviousEngagementRate: z
        .number()
        .nullable()
        .describe('Change in engagement rate compared to previous email'),
      trackedLinks: z
        .array(
          z.object({
            url: z.string().describe('URL of the tracked link'),
            uniqueClicks: z.number().describe('Number of unique clicks on this link'),
            engagementRate: z.number().describe('Engagement rate percentage for this link')
          })
        )
        .describe('Per-link tracking with click counts and engagement rates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let analytics = await client.getEmailAnalytics(ctx.input.newsletterEmailId);

    return {
      output: analytics,
      message: `Analytics for email **${analytics.newsletterEmailId}**: ${analytics.recipients} recipients, ${analytics.uniqueOpens} opens, ${analytics.uniqueClicks} clicks, ${analytics.engagementRate}% engagement rate.`
    };
  })
  .build();
