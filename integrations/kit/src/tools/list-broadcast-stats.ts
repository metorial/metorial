import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let broadcastStatsSchema = z.object({
  broadcastId: z.number().describe('Broadcast ID'),
  subject: z.string().optional().describe('Broadcast subject'),
  sendAt: z.string().nullable().optional().describe('Scheduled or sent time'),
  recipients: z.number().describe('Total number of recipients'),
  openRate: z.number().describe('Open rate (0-1)'),
  emailsOpened: z.number().optional().describe('Number of emails opened'),
  clickRate: z.number().describe('Click rate (0-1)'),
  unsubscribeRate: z.number().optional().describe('Unsubscribe rate (0-1)'),
  unsubscribes: z.number().describe('Number of unsubscribes'),
  totalClicks: z.number().describe('Total click count'),
  status: z.string().describe('Broadcast status'),
  progress: z.number().describe('Send progress')
});

export let listBroadcastStats = SlateTool.create(spec, {
  name: 'List Broadcast Stats',
  key: 'list_broadcast_stats',
  description: `List performance statistics for broadcasts with optional sent date filters and cursor pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sentAfter: z.string().optional().describe('Filter broadcasts sent after this date'),
      sentBefore: z.string().optional().describe('Filter broadcasts sent before this date'),
      perPage: z.number().optional().describe('Number of results per page (max 1000)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      broadcasts: z.array(broadcastStatsSchema).describe('Broadcast stats'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBroadcastStats({
      sentAfter: ctx.input.sentAfter,
      sentBefore: ctx.input.sentBefore,
      perPage: ctx.input.perPage,
      after: ctx.input.afterCursor,
      before: ctx.input.beforeCursor
    });

    let broadcasts = result.data.map(b => ({
      broadcastId: b.id,
      subject: b.subject,
      sendAt: b.send_at,
      recipients: b.stats.recipients,
      openRate: b.stats.open_rate,
      emailsOpened: b.stats.emails_opened,
      clickRate: b.stats.click_rate,
      unsubscribeRate: b.stats.unsubscribe_rate,
      unsubscribes: b.stats.unsubscribes,
      totalClicks: b.stats.total_clicks,
      status: b.stats.status,
      progress: b.stats.progress
    }));

    return {
      output: {
        broadcasts,
        hasNextPage: result.pagination.has_next_page,
        endCursor: result.pagination.end_cursor
      },
      message: `Found stats for **${broadcasts.length}** broadcasts.`
    };
  })
  .build();
