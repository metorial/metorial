import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBroadcastStats = SlateTool.create(spec, {
  name: 'Get Broadcast Stats',
  key: 'get_broadcast_stats',
  description: `Retrieve performance statistics for a broadcast including recipients, opens, clicks, unsubscribes, status, and send progress.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      broadcastId: z.number().describe('The broadcast ID to get stats for')
    })
  )
  .output(
    z.object({
      broadcastId: z.number().describe('Broadcast ID'),
      recipients: z.number().describe('Total number of recipients'),
      openRate: z.number().describe('Open rate (0-1)'),
      emailsOpened: z.number().optional().describe('Number of emails opened'),
      clickRate: z.number().describe('Click rate (0-1)'),
      unsubscribeRate: z.number().optional().describe('Unsubscribe rate (0-1)'),
      unsubscribes: z.number().describe('Number of unsubscribes'),
      totalClicks: z.number().describe('Total click count'),
      showTotalClicks: z.boolean().describe('Whether total click count is available'),
      status: z.string().describe('Broadcast status'),
      progress: z.number().describe('Send progress'),
      openTrackingDisabled: z
        .boolean()
        .optional()
        .describe('Whether open tracking is disabled'),
      clickTrackingDisabled: z
        .boolean()
        .optional()
        .describe('Whether click tracking is disabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getBroadcastStats(ctx.input.broadcastId);
    let stats = data.broadcast.stats;

    return {
      output: {
        broadcastId: data.broadcast.id,
        recipients: stats.recipients,
        openRate: stats.open_rate,
        emailsOpened: stats.emails_opened,
        clickRate: stats.click_rate,
        unsubscribeRate: stats.unsubscribe_rate,
        unsubscribes: stats.unsubscribes,
        totalClicks: stats.total_clicks,
        showTotalClicks: stats.show_total_clicks,
        status: stats.status,
        progress: stats.progress,
        openTrackingDisabled: stats.open_tracking_disabled,
        clickTrackingDisabled: stats.click_tracking_disabled
      },
      message: `Broadcast \`${data.broadcast.id}\`: ${stats.recipients} recipients, ${(stats.open_rate * 100).toFixed(1)}% open rate, ${(stats.click_rate * 100).toFixed(1)}% click rate.`
    };
  })
  .build();
