import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBroadcastStats = SlateTool.create(spec, {
  name: 'Get Broadcast Stats',
  key: 'get_broadcast_stats',
  description: `Retrieve performance statistics for a broadcast including open rate, click rate, recipient count, and unsubscribes.`,
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
      subject: z.string().describe('Email subject line'),
      recipients: z.number().describe('Total number of recipients'),
      openRate: z.number().describe('Open rate (0-1)'),
      clickRate: z.number().describe('Click rate (0-1)'),
      unsubscribes: z.number().describe('Number of unsubscribes'),
      totalClicks: z.number().describe('Total click count'),
      status: z.string().describe('Broadcast status'),
      sendAt: z.string().nullable().describe('When the broadcast was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getBroadcastStats(ctx.input.broadcastId);
    let b = data.broadcast;

    return {
      output: {
        broadcastId: b.id,
        subject: b.subject,
        recipients: b.recipients,
        openRate: b.open_rate,
        clickRate: b.click_rate,
        unsubscribes: b.unsubscribes,
        totalClicks: b.total_clicks,
        status: b.status,
        sendAt: b.send_at
      },
      message: `Broadcast **${b.subject}**: ${b.recipients} recipients, ${(b.open_rate * 100).toFixed(1)}% open rate, ${(b.click_rate * 100).toFixed(1)}% click rate.`
    };
  })
  .build();
