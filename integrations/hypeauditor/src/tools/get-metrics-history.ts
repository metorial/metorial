import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMetricsHistory = SlateTool.create(spec, {
  name: 'Get Metrics History',
  key: 'get_metrics_history',
  description: `Access historical performance data for an influencer account on Instagram, TikTok, Twitter/X, or Twitch. Returns time-series data including follower count history and other platform-specific metrics over time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z
        .enum(['instagram', 'tiktok', 'twitter', 'twitch'])
        .describe('Social media platform'),
      channel: z.string().describe('Username or channel name/ID')
    })
  )
  .output(
    z.object({
      history: z
        .any()
        .describe(
          'Historical metrics data including follower charts and platform-specific time-series data'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let response: any;

    switch (ctx.input.platform) {
      case 'instagram':
        response = await client.getInstagramHistory(ctx.input.channel);
        break;
      case 'tiktok':
        response = await client.getTiktokHistory(ctx.input.channel);
        break;
      case 'twitter':
        response = await client.getTwitterHistory(ctx.input.channel);
        break;
      case 'twitch':
        response = await client.getTwitchHistory(ctx.input.channel);
        break;
    }

    return {
      output: {
        history: response?.result ?? response
      },
      message: `Retrieved metrics history for **${ctx.input.channel}** on ${ctx.input.platform}.`
    };
  })
  .build();
