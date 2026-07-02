import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscriberStats = SlateTool.create(spec, {
  name: 'Get Subscriber Stats',
  key: 'get_subscriber_stats',
  description: `Retrieve email engagement stats for a specific subscriber, optionally filtered by email sent date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriberId: z.number().describe('Subscriber ID'),
      emailSentAfter: z
        .string()
        .optional()
        .describe('Only include stats for emails sent after this yyyy-mm-dd date'),
      emailSentBefore: z
        .string()
        .optional()
        .describe('Only include stats for emails sent before this yyyy-mm-dd date')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Subscriber ID'),
      sent: z.number().describe('Emails sent'),
      opened: z.number().describe('Emails opened'),
      clicked: z.number().describe('Emails clicked'),
      bounced: z.number().describe('Emails bounced'),
      openRate: z.number().describe('Open rate (0-1)'),
      clickRate: z.number().describe('Click rate (0-1)'),
      lastSent: z.string().nullable().describe('Most recent sent timestamp'),
      lastOpened: z.string().nullable().describe('Most recent opened timestamp'),
      lastClicked: z.string().nullable().describe('Most recent clicked timestamp'),
      sendsSinceLastOpen: z.number().nullable().describe('Sends since last open'),
      sendsSinceLastClick: z.number().nullable().describe('Sends since last click')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getSubscriberStats(ctx.input.subscriberId, {
      emailSentAfter: ctx.input.emailSentAfter,
      emailSentBefore: ctx.input.emailSentBefore
    });
    let stats = data.subscriber.stats;

    return {
      output: {
        subscriberId: data.subscriber.id,
        sent: stats.sent,
        opened: stats.opened,
        clicked: stats.clicked,
        bounced: stats.bounced,
        openRate: stats.open_rate,
        clickRate: stats.click_rate,
        lastSent: stats.last_sent,
        lastOpened: stats.last_opened,
        lastClicked: stats.last_clicked,
        sendsSinceLastOpen: stats.sends_since_last_open,
        sendsSinceLastClick: stats.sends_since_last_click
      },
      message: `Subscriber \`${data.subscriber.id}\`: ${stats.sent} sent, ${stats.opened} opened, ${stats.clicked} clicked.`
    };
  })
  .build();
